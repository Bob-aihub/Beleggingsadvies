export type Horizon = "KORT" | "MIDDELLANG" | "LANG";

export interface PredictionInput {
  date: string | Date;
  expectedPrice: number;
  expectedPriceLow?: number | null;
  expectedPriceHigh?: number | null;
  horizon: string;
  targetDate?: string | Date | null;
}

export interface Evaluation {
  deviationPct: number;
  direction: "HOGER" | "LAGER" | "GELIJK";
  withinRange: boolean | null;
  verdict: "GOED" | "DEELS" | "FOUT";
  color: "groen" | "amber" | "rood";
}

export function evaluatePrediction(prediction: PredictionInput, actualPrice: number): Evaluation {
  const deviationPct = ((actualPrice - prediction.expectedPrice) / prediction.expectedPrice) * 100;
  const direction = actualPrice > prediction.expectedPrice ? "HOGER" : actualPrice < prediction.expectedPrice ? "LAGER" : "GELIJK";

  let withinRange: boolean | null = null;
  if (prediction.expectedPriceLow != null && prediction.expectedPriceHigh != null) {
    withinRange = actualPrice >= prediction.expectedPriceLow && actualPrice <= prediction.expectedPriceHigh;
  }

  let verdict: Evaluation["verdict"];
  if (withinRange === true) verdict = "GOED";
  else if (withinRange === false) {
    verdict = Math.abs(deviationPct) <= 10 ? "DEELS" : "FOUT";
  } else {
    verdict = Math.abs(deviationPct) <= 5 ? "GOED" : Math.abs(deviationPct) <= 15 ? "DEELS" : "FOUT";
  }

  const color = verdict === "GOED" ? "groen" : verdict === "DEELS" ? "amber" : "rood";
  return { deviationPct, direction, withinRange, verdict, color };
}

export interface ScorecardRow {
  id: string;
  ticker: string;
  horizon: string;
  evaluation: Evaluation;
}

export interface HorizonCalibration {
  horizon: string;
  count: number;
  hitRatio: number;
  avgDeviationPct: number;
  color: "groen" | "amber" | "rood";
}

export interface Scorecard {
  count: number;
  hitRatio: number;
  avgDeviationPct: number;
  best: ScorecardRow | null;
  worst: ScorecardRow | null;
  calibration: HorizonCalibration[];
}

function colorFor(hitRatio: number, avgAbsDeviation: number): HorizonCalibration["color"] {
  if (hitRatio >= 0.66 && avgAbsDeviation <= 10) return "groen";
  if (hitRatio >= 0.4 || avgAbsDeviation <= 15) return "amber";
  return "rood";
}

export function buildScorecard(rows: ScorecardRow[]): Scorecard {
  if (rows.length === 0) {
    return { count: 0, hitRatio: 0, avgDeviationPct: 0, best: null, worst: null, calibration: [] };
  }

  const hits = rows.filter((r) => r.evaluation.verdict !== "FOUT").length;
  const hitRatio = hits / rows.length;
  const avgDeviationPct = rows.reduce((acc, r) => acc + r.evaluation.deviationPct, 0) / rows.length;

  const sortedByAbs = [...rows].sort(
    (a, b) => Math.abs(a.evaluation.deviationPct) - Math.abs(b.evaluation.deviationPct)
  );
  const best = sortedByAbs[0] ?? null;
  const worst = sortedByAbs[sortedByAbs.length - 1] ?? null;

  const horizons = ["KORT", "MIDDELLANG", "LANG"];
  const calibration: HorizonCalibration[] = horizons.map((h) => {
    const subset = rows.filter((r) => r.horizon === h);
    if (subset.length === 0) {
      return { horizon: h, count: 0, hitRatio: 0, avgDeviationPct: 0, color: "amber" as const };
    }
    const hHits = subset.filter((r) => r.evaluation.verdict !== "FOUT").length;
    const hHitRatio = hHits / subset.length;
    const hAvg = subset.reduce((acc, r) => acc + r.evaluation.deviationPct, 0) / subset.length;
    const avgAbs = subset.reduce((acc, r) => acc + Math.abs(r.evaluation.deviationPct), 0) / subset.length;
    return { horizon: h, count: subset.length, hitRatio: hHitRatio, avgDeviationPct: hAvg, color: colorFor(hHitRatio, avgAbs) };
  });

  return { count: rows.length, hitRatio, avgDeviationPct, best, worst, calibration };
}
