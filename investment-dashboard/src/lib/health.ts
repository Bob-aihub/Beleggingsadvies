import type { PositionLike } from "./types";
import {
  allocationBySector,
  allocationByCurrency,
  allocationByPosition,
  allocationByAssetClass,
  herfindahlIndex,
  topConcentration,
  effectiveNumberOfPositions,
  type AllocationSlice,
} from "./allocations";

export type Level = "goed" | "let op" | "risico" | "onbekend";

export interface HealthCheck {
  label: string;
  value: string;
  level: Level;
  explanation: string;
}

const UNKNOWN = "Kan momenteel niet betrouwbaar verifiëren";

function weightOf(positions: PositionLike[]): number[] {
  const slices = allocationByPosition(positions);
  return slices.map((s) => s.weightPct);
}

function totalValue(positions: PositionLike[]): number {
  return positions.reduce((acc, p) => {
    const v = p.marketValue ?? (p.currentPrice !== null ? p.currentPrice * p.quantity : null);
    return acc + (v ?? 0);
  }, 0);
}

export function diversificationCheck(positions: PositionLike[]): HealthCheck {
  const slices = allocationByPosition(positions);
  if (slices.length < 2) {
    return {
      label: "Diversificatie",
      value: slices.length === 0 ? UNKNOWN : "1 positie",
      level: slices.length === 0 ? "onbekend" : "risico",
      explanation:
        slices.length === 0
          ? "Er zijn geen posities om te beoordelen."
          : "De portefeuille bestaat uit één positie: elke koersbeweging heeft direct volledige impact.",
    };
  }
  const hhi = herfindahlIndex(slices);
  const eff = effectiveNumberOfPositions(hhi);
  const level: Level = eff >= 10 ? "goed" : eff >= 5 ? "let op" : "risico";
  return {
    label: "Diversificatie",
    value: `${eff.toFixed(1)} effectieve posities`,
    level,
    explanation:
      `Gebaseerd op de Herfindahl-index van de gewichten: hoe lager de index, hoe meer "effectief evenwijdige" posities. ` +
      `${eff.toFixed(1)} effectieve posities betekent dat de portefeuille zich gedraagt als ${eff.toFixed(1)} gelijkwaardige, onafhankelijke lijnen.`,
  };
}

export function concentrationCheck(positions: PositionLike[]): HealthCheck {
  const slices = allocationByPosition(positions);
  if (slices.length === 0) {
    return { label: "Concentratie", value: UNKNOWN, level: "onbekend", explanation: "Geen posities beschikbaar." };
  }
  const top5 = topConcentration(slices, 5);
  const largest = slices[0];
  const level: Level = top5 > 80 || largest.weightPct > 25 ? "risico" : top5 > 60 || largest.weightPct > 15 ? "let op" : "goed";
  return {
    label: "Concentratie",
    value: `Top 5: ${top5.toFixed(0)}% — grootste: ${largest.key} ${largest.weightPct.toFixed(0)}%`,
    level,
    explanation:
      "Het aandeel van de vijf grootste posities in de totale marktwaarde. Boven ~80% is de portefeuille sterk afhankelijk van enkele namen.",
  };
}

export function currencyCheck(positions: PositionLike[]): HealthCheck {
  const slices = allocationByCurrency(positions);
  if (slices.length === 0) {
    return { label: "Valutarisico", value: UNKNOWN, level: "onbekend", explanation: "Geen valuta-informatie beschikbaar." };
  }
  const nonEur = slices.filter((s) => s.key !== "EUR");
  const pct = nonEur.reduce((acc, s) => acc + s.weightPct, 0);
  const level: Level = pct > 50 ? "let op" : pct > 25 ? "let op" : "goed";
  return {
    label: "Valutarisico",
    value: `${pct.toFixed(0)}% niet in EUR`,
    level,
    explanation:
      `Aandeel van posities die niet in euro's noteren (${nonEur.map((s) => `${s.key}: ${s.weightPct.toFixed(0)}%`).join(", ") || "geen"}). ` +
      "Wisselkoersschommelingen beïnvloeden de waarde in EUR onafhankelijk van de koers van het fonds.",
  };
}

export function valuationCheck(positions: PositionLike[]): HealthCheck {
  const withPe = positions.filter((p) => (p as PositionLike & { peRatio?: number | null }).peRatio != null);
  if (withPe.length === 0) {
    return {
      label: "Waardering",
      value: UNKNOWN,
      level: "onbekend",
      explanation:
        "Er zijn geen betrouwbare koers-winstverhoudingen beschikbaar uit een gecontroleerde bron. Zonder verifieerbare cijfers doet de app geen uitspraak over waardering.",
    };
  }
  return {
    label: "Waardering",
    value: `${withPe.length} posities met K/W`,
    level: "goed",
    explanation: "Waarderingen komen uit de marktdataprovider met tijdstempel; zie de detailweergave per positie.",
  };
}

export function dividendCheck(positions: PositionLike[]): HealthCheck {
  const withDiv = positions.filter((p) => p.dividend != null && p.dividend > 0);
  if (withDiv.length === 0) {
    return {
      label: "Dividendconcentratie",
      value: UNKNOWN,
      level: "onbekend",
      explanation: "Geen dividendgegevens beschikbaar in de import of marktdatabron.",
    };
  }
  const total = totalValue(withDiv);
  const slices = allocationByPosition(withDiv);
  const top = slices[0];
  const yieldTotal = totalValue(positions) > 0 ? (total / totalValue(positions)) * 100 : 0;
  const level: Level = top && top.weightPct > 40 ? "let op" : "goed";
  return {
    label: "Dividendconcentratie",
    value: `~${yieldTotal.toFixed(1)}% van waarde; top: ${top ? top.key : "onbekend"}`,
    level,
    explanation:
      "Op basis van de laatst bekende dividenden in de import. Een sterk gewicht van één dividendbetaler maakt het inkomen gevoelig voor dividendverlagingen.",
  };
}

export function overlapCheck(positions: PositionLike[]): HealthCheck {
  const etfs = positions.filter((p) => p.isEtf);
  const stocks = positions.filter((p) => !p.isEtf);
  if (etfs.length === 0 || stocks.length === 0) {
    return {
      label: "ETF/aandeel-overlap",
      value: "geen overlap te bepalen",
      level: "goed",
      explanation:
        "Er is geen overlap berekend omdat er geen combinatie van ETF's en losse aandelen is, of omdat de holdings van de ETF's niet verifieerbaar beschikbaar zijn.",
    };
  }
  const overlaps: string[] = [];
  for (const s of stocks) {
    for (const e of etfs) {
      const sectorMatch = s.sector !== "onbekend" && e.sector !== "onbekend" && s.sector === e.sector;
      const regionMatch = s.region !== "onbekend" && e.region !== "onbekend" && s.region === e.region;
      if (sectorMatch && regionMatch) overlaps.push(`${s.name} ↔ ${e.name} (${s.sector}/${s.region})`);
    }
  }
  const level: Level = overlaps.length > 0 ? "let op" : "goed";
  return {
    label: "ETF/aandeel-overlap",
    value: overlaps.length > 0 ? `${overlaps.length} mogelijke overlap(pen)` : "geen duidelijke overlap",
    level,
    explanation:
      overlaps.length > 0
        ? `Mogelijke overlap in sector én regio: ${overlaps.join("; ")}. Volledige holdingsdatabases van ETF's zijn niet gratis verifieerbaar via de huidige bron; dit is een indicatie, geen garantie.`
        : "Op basis van sector en regio is geen duidelijke overlap gevonden tussen ETF's en losse aandelen.",
  };
}

export interface RiskItem {
  risk: string;
  impact: "laag" | "gemiddeld" | "hoog";
  explanation: string;
}

export function riskRadar(positions: PositionLike[]): RiskItem[] {
  const risks: RiskItem[] = [];
  const slices = allocationByPosition(positions);
  const currencies = allocationByCurrency(positions);
  const sectors = allocationBySector(positions);

  const top5 = topConcentration(slices, 5);
  if (top5 > 60) {
    risks.push({
      risk: "Concentratie",
      impact: top5 > 80 ? "hoog" : "gemiddeld",
      explanation: `De top 5 posities vertegenwoordigen ${top5.toFixed(0)}% van de portefeuille.`,
    });
  }
  const nonEur = currencies.filter((c) => c.key !== "EUR").reduce((a, c) => a + c.weightPct, 0);
  if (nonEur > 20) {
    risks.push({
      risk: "Valuta",
      impact: nonEur > 50 ? "hoog" : "gemiddeld",
      explanation: `${nonEur.toFixed(0)}% van de portefeuille notert niet in EUR.`,
    });
  }
  const tech = sectors.find((s) => s.key === "Technologie");
  if (tech && tech.weightPct > 30) {
    risks.push({
      risk: "Sectoren",
      impact: tech.weightPct > 45 ? "hoog" : "gemiddeld",
      explanation: `Technologie weegt ${tech.weightPct.toFixed(0)}%; deze sector is gevoelig voor rentebesluiten en waarderingscorrecties.`,
    });
  }
  risks.push({
    risk: "Rente",
    impact: "gemiddeld",
    explanation:
      "Groeiaandelen en lange duratie zijn gevoelig voor rentewijzigingen. Actueel rentepad verifiëren via ECB/Fed-publicaties (zie bronnen bij aanbevelingen).",
  });
  risks.push({
    risk: "Geopolitiek",
    impact: "gemiddeld",
    explanation: "Handelsspanningen en conflicten kunnen leveringsketens en sentiment beïnvloeden. Volg het nieuwsfeed per positie.",
  });
  return risks;
}

export function portfolioHealth(positions: PositionLike[]): HealthCheck[] {
  return [
    diversificationCheck(positions),
    concentrationCheck(positions),
    valuationCheck(positions),
    currencyCheck(positions),
    dividendCheck(positions),
    overlapCheck(positions),
  ];
}
