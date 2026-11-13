import type { ParseResult, ParsedPosition } from "./types";

const ISIN_RE = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/;
const NUMBER_RE = /-?\d{1,3}(?:[.\u00a0 ]\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/g;

const ETF_HINTS = ["etf", "ucits", "ishares", "vanguard", "xtrackers", "amundi", "spdr", "invesco"];

const SECTOR_MAP: Array<[RegExp, string]> = [
  [/asml|semi|nxp|stmicro/i, "Technologie"],
  [/apple|microsoft|alphabet|amazon|meta|nvidia|tesla/i, "Technologie"],
  [/nestle|unilever|danone|abal|consument/i, "Consumentengoederen"],
  [/lvmh|hermes|l'or[ée]al|luxe/i, "Luxe & retail"],
  [/total|shell|energie|exxon/i, "Energie"],
  [/sanofi|novartis|novonordisk|pharma|gezondheid|j&j|johnson/i, "Gezondheidszorg"],
  [/kbc|bnp|ing|bank|verzekering|axa|ageas/i, "Financiële diensten"],
  [/colruyt|delhaize|ahold|retail|carrefour/i, "Retail"],
];

const REGION_MAP: Array<[RegExp, string]> = [
  [/belgië|belgium|brussels|ebnr|kbc|colruyt|ucb|solvay|ageas|abal/i, "België"],
  [/euro|amsterdam|frankrijk|duitsland|nederland|paris|xetr|ams|xbru/i, "Europa"],
  [/nasdaq|nyse|us\b|verenigde staten|united states/i, "VS"],
  [/japan|tokyo|azie|asia|china|hong kong/i, "Azië"],
  [/world|wereld|global|all-country|acwi/i, "Wereldwijd"],
];

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\u00a0 ](?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractNumbers(line: string): number[] {
  const matches = line.match(NUMBER_RE);
  if (!matches) return [];
  return matches.map(parseNumber).filter((n): n is number => n !== null);
}

function guessSector(name: string): string {
  for (const [re, sector] of SECTOR_MAP) if (re.test(name)) return sector;
  return "onbekend";
}

function guessRegion(name: string, exchange: string | null): string {
  for (const [re, region] of REGION_MAP) if (re.test(name) || (exchange && re.test(exchange))) return region;
  return "onbekend";
}

function buildPosition(line: string): ParsedPosition | null {
  const isinMatch = line.match(ISIN_RE);
  if (!isinMatch) return null;
  const isin = isinMatch[1];
  const name = line.slice(0, line.indexOf(isin)).trim().replace(/\s{2,}/g, " ") || isin;
  const after = line.slice(line.indexOf(isin) + isin.length);
  const numbers = extractNumbers(after);

  const warnings: string[] = [];
  let quantity: number | null = null;
  let purchasePrice: number | null = null;
  let currentPrice: number | null = null;
  let marketValue: number | null = null;
  let returnPct: number | null = null;
  let dividend: number | null = null;

  if (numbers.length >= 1) quantity = numbers[0];
  if (numbers.length >= 2) {
    [purchasePrice, currentPrice, marketValue, returnPct, dividend] = numbers.slice(1);
  }

  if (quantity === null) warnings.push("Aantal niet herkend — vul handmatig in.");
  if (purchasePrice === null) warnings.push("Aankoopprijs onbekend.");
  if (currentPrice === null) warnings.push("Huidige koers onbekend.");
  if (marketValue === null && quantity !== null && currentPrice !== null) {
    marketValue = quantity * currentPrice;
  }

  const exchangeMatch = after.match(/\b([A-Z]{3,4}:[A-Z0-9.]{1,10}|[A-Za-z ]+beurs|XAMS|XBRU|XPAR|XETR|NASDAQ|NYSE)\b/);
  const exchange = exchangeMatch ? exchangeMatch[1] : null;
  const currencyMatch = (after.match(/\b(EUR|USD|GBP|CHF|JPY|SEK|NOK|DKK)\b/) ?? line.match(/\b(EUR|USD|GBP|CHF|JPY|SEK|NOK|DKK)\b/));
  const isEtf = ETF_HINTS.some((h) => name.toLowerCase().includes(h));

  return {
    name,
    isin,
    ticker: null,
    exchange,
    assetClass: isEtf ? "ETF" : "Aandeel",
    sector: guessSector(name),
    region: guessRegion(name, exchange),
    quantity,
    purchasePrice,
    currentPrice,
    currency: currencyMatch ? currencyMatch[1] : "EUR",
    marketValue,
    returnPct,
    dividend,
    isEtf,
    raw: line.trim(),
    warnings,
  };
}

const EXPORT_DATE_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => Date]> = [
  [
    /(?:export|datum|date|gegenereerd|generated)\s*[:=]?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/i,
    (m) => new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
  ],
  [
    /(\d{4})-(\d{2})-(\d{2})/,
    (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  ],
  [
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/,
    (m) => new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
  ],
];

const CASH_PATTERNS = [
  /(?:available\s+funds|beschikbare\s+middelen|cash\s+available|contant|cash)\s*[:=]?\s*(-?[\d.,\u00a0 ]+)/i,
];

export function parseSaxoPdfText(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter((l) => l.length > 0);

  let exportDate: string | null = null;
  for (const line of lines) {
    for (const [re, build] of EXPORT_DATE_PATTERNS) {
      const m = line.match(re);
      if (m) {
        const d = build(m);
        if (!Number.isNaN(d.getTime())) {
          exportDate = d.toISOString();
          break;
        }
      }
    }
    if (exportDate) break;
  }
  if (!exportDate) warnings.push("Exportdatum niet gevonden in de PDF — controleer handmatig.");

  let cash: number | null = null;
  for (const line of lines) {
    for (const re of CASH_PATTERNS) {
      const m = line.match(re);
      if (m) {
        const n = parseNumber(m[1].trim());
        if (n !== null) cash = n;
      }
    }
  }

  const positions: ParsedPosition[] = [];
  const unparsedLines: string[] = [];
  for (const line of lines) {
    if (!ISIN_RE.test(line)) continue;
    if (/^\s*(isin|instrument)\b/i.test(line)) continue;
    const pos = buildPosition(line);
    if (pos) positions.push(pos);
    else unparsedLines.push(line);
  }

  if (positions.length === 0) {
    warnings.push("Geen posities met ISIN herkend. Controleer of dit een Saxo portefeuille-export is.");
  }

  return { exportDate, cash, currency: "EUR", positions, unparsedLines, warnings };
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParseResult> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return parseSaxoPdfText(result.text);
}
