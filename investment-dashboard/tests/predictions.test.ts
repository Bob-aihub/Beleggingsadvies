import { describe, it, expect } from "vitest";
import { evaluatePrediction, buildScorecard, type ScorecardRow } from "@/lib/predictions";

describe("evaluatePrediction", () => {
  const base = {
    date: "2025-01-01",
    expectedPrice: 100,
    horizon: "KORT",
  };

  it("berekent positieve afwijking bij hogere effectieve koers", () => {
    const e = evaluatePrediction(base, 110);
    expect(e.deviationPct).toBeCloseTo(10, 5);
    expect(e.direction).toBe("HOGER");
  });

  it("berekent negatieve afwijking bij lagere effectieve koers", () => {
    const e = evaluatePrediction(base, 90);
    expect(e.deviationPct).toBeCloseTo(-10, 5);
    expect(e.direction).toBe("LAGER");
  });

  it("geeft GOED binnen een opgegeven bereik", () => {
    const e = evaluatePrediction({ ...base, expectedPriceLow: 95, expectedPriceHigh: 105 }, 103);
    expect(e.withinRange).toBe(true);
    expect(e.verdict).toBe("GOED");
    expect(e.color).toBe("groen");
  });

  it("geeft FOUT buiten het bereik met grote afwijking", () => {
    const e = evaluatePrediction({ ...base, expectedPriceLow: 95, expectedPriceHigh: 105 }, 130);
    expect(e.withinRange).toBe(false);
    expect(e.verdict).toBe("FOUT");
    expect(e.color).toBe("rood");
  });

  it("geeft DEELS bij kleine afwijking zonder bereik", () => {
    const e = evaluatePrediction(base, 112);
    expect(e.verdict).toBe("DEELS");
    expect(e.color).toBe("amber");
  });
});

describe("buildScorecard", () => {
  const row = (id: string, ticker: string, horizon: string, deviationPct: number, verdict: ScorecardRow["evaluation"]["verdict"]): ScorecardRow => ({
    id,
    ticker,
    horizon,
    evaluation: { deviationPct, direction: deviationPct >= 0 ? "HOGER" : "LAGER", withinRange: null, verdict, color: verdict === "GOED" ? "groen" : verdict === "DEELS" ? "amber" : "rood" },
  });

  it("geeft een lege scorekaart zonder rijen", () => {
    const s = buildScorecard([]);
    expect(s.count).toBe(0);
    expect(s.best).toBeNull();
    expect(s.worst).toBeNull();
  });

  it("berekent hitratio, gemiddelde afwijking, beste en slechtste", () => {
    const rows = [
      row("1", "A", "KORT", 2, "GOED"),
      row("2", "B", "KORT", -4, "GOED"),
      row("3", "C", "LANG", 25, "FOUT"),
    ];
    const s = buildScorecard(rows);
    expect(s.count).toBe(3);
    expect(s.hitRatio).toBeCloseTo(2 / 3, 5);
    expect(s.avgDeviationPct).toBeCloseTo((2 - 4 + 25) / 3, 5);
    expect(s.best!.ticker).toBe("A");
    expect(s.worst!.ticker).toBe("C");
  });

  it("kalibreert per horizon met kleurcodering", () => {
    const rows = [
      row("1", "A", "KORT", 1, "GOED"),
      row("2", "B", "KORT", -2, "GOED"),
      row("3", "C", "LANG", 30, "FOUT"),
    ];
    const s = buildScorecard(rows);
    const kort = s.calibration.find((c) => c.horizon === "KORT")!;
    const lang = s.calibration.find((c) => c.horizon === "LANG")!;
    expect(kort.count).toBe(2);
    expect(kort.hitRatio).toBe(1);
    expect(kort.color).toBe("groen");
    expect(lang.hitRatio).toBe(0);
    expect(lang.color).toBe("rood");
  });

  it("geeft amber voor middelmatige kalibratie", () => {
    const rows = [row("1", "A", "MIDDELLANG", 12, "DEELS")];
    const s = buildScorecard(rows);
    expect(s.calibration[0].color).toBe("amber");
  });
});
