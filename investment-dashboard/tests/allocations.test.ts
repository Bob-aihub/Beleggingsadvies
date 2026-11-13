import { describe, it, expect } from "vitest";
import {
  allocationByAssetClass,
  allocationBySector,
  allocationByCurrency,
  allocationByPosition,
  topConcentration,
  herfindahlIndex,
  effectiveNumberOfPositions,
} from "@/lib/allocations";
import type { PositionLike } from "@/lib/types";

const p = (name: string, marketValue: number, over: Partial<PositionLike> = {}): PositionLike => ({
  name,
  ticker: name,
  isin: null,
  quantity: 1,
  purchasePrice: null,
  currentPrice: marketValue,
  currency: "EUR",
  marketValue,
  returnPct: null,
  dividend: null,
  assetClass: "Aandeel",
  sector: "onbekend",
  region: "onbekend",
  isEtf: false,
  ...over,
});

describe("allocatieberekeningen", () => {
  const positions = [
    p("A", 600, { assetClass: "ETF", sector: "Tech", region: "Wereldwijd", currency: "EUR" }),
    p("B", 300, { assetClass: "Aandeel", sector: "Tech", region: "VS", currency: "USD" }),
    p("C", 100, { assetClass: "Aandeel", sector: "Retail", region: "België", currency: "EUR" }),
  ];

  it("berekent gewichten per assetklasse", () => {
    const slices = allocationByAssetClass(positions);
    expect(slices).toHaveLength(2);
    expect(slices[0].key).toBe("ETF");
    expect(slices[0].weightPct).toBeCloseTo(60, 5);
    expect(slices[1].weightPct).toBeCloseTo(40, 5);
  });

  it("groepeert per sector, valuta en positie", () => {
    expect(allocationBySector(positions).map((s) => s.key)).toEqual(["Tech", "Retail"]);
    expect(allocationByCurrency(positions).map((s) => s.key)).toEqual(["EUR", "USD"]);
    expect(allocationByPosition(positions).map((s) => s.key)).toEqual(["A", "B", "C"]);
  });

  it("berekent top-N-concentratie", () => {
    const slices = allocationByPosition(positions);
    expect(topConcentration(slices, 2)).toBeCloseTo(90, 5);
    expect(topConcentration(slices, 5)).toBeCloseTo(100, 5);
  });

  it("berekent de Herfindahl-index en effectief aantal posities", () => {
    const hhi = herfindahlIndex(allocationByPosition(positions));
    expect(hhi).toBeCloseTo(0.36 + 0.09 + 0.01, 5);
    expect(effectiveNumberOfPositions(hhi)).toBeCloseTo(1 / 0.46, 5);
  });

  it("geeft gelijke gewichten bij gelijke posities", () => {
    const equal = [p("X", 100), p("Y", 100), p("Z", 100), p("W", 100)];
    const slices = allocationByPosition(equal);
    expect(slices.every((s) => Math.abs(s.weightPct - 25) < 1e-9)).toBe(true);
    expect(herfindahlIndex(slices)).toBeCloseTo(0.25, 5);
    expect(effectiveNumberOfPositions(0.25)).toBeCloseTo(4, 5);
  });

  it("geeft een leeg resultaat zonder waardeerbare posities", () => {
    const empty = [p("N", 0, { marketValue: null, currentPrice: null })];
    expect(allocationByAssetClass(empty)).toHaveLength(0);
  });
});
