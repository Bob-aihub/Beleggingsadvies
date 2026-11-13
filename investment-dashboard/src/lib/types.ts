export interface ParsedPosition {
  name: string;
  isin: string | null;
  ticker: string | null;
  exchange: string | null;
  assetClass: string;
  sector: string;
  region: string;
  quantity: number | null;
  purchasePrice: number | null;
  currentPrice: number | null;
  currency: string;
  marketValue: number | null;
  returnPct: number | null;
  dividend: number | null;
  isEtf: boolean;
  raw: string;
  warnings: string[];
}

export interface ParseResult {
  exportDate: string | null;
  cash: number | null;
  currency: string;
  positions: ParsedPosition[];
  unparsedLines: string[];
  warnings: string[];
}

export interface PositionLike {
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number;
  purchasePrice: number | null;
  currentPrice: number | null;
  currency: string;
  marketValue: number | null;
  returnPct: number | null;
  dividend: number | null;
  assetClass: string;
  sector: string;
  region: string;
  isEtf: boolean;
}
