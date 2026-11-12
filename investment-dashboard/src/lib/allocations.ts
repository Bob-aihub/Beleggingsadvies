import type { PositionLike } from "./types";

export interface AllocationSlice {
  key: string;
  value: number;
  weightPct: number;
}

function groupBy(positions: PositionLike[], keyFn: (p: PositionLike) => string): AllocationSlice[] {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const p of positions) {
    const value = p.marketValue ?? (p.currentPrice !== null ? p.currentPrice * p.quantity : null);
    if (value === null || value === undefined) continue;
    const key = keyFn(p) || "onbekend";
    totals.set(key, (totals.get(key) ?? 0) + value);
    sum += value;
  }
  if (sum === 0) return [];
  return [...totals.entries()]
    .map(([key, value]) => ({ key, value, weightPct: (value / sum) * 100 }))
    .sort((a, b) => b.value - a.value);
}

export function allocationByAssetClass(positions: PositionLike[]): AllocationSlice[] {
  return groupBy(positions, (p) => p.assetClass);
}

export function allocationBySector(positions: PositionLike[]): AllocationSlice[] {
  return groupBy(positions, (p) => p.sector);
}

export function allocationByRegion(positions: PositionLike[]): AllocationSlice[] {
  return groupBy(positions, (p) => p.region);
}

export function allocationByCurrency(positions: PositionLike[]): AllocationSlice[] {
  return groupBy(positions, (p) => p.currency);
}

export function allocationByPosition(positions: PositionLike[]): AllocationSlice[] {
  return groupBy(positions, (p) => p.name);
}

export function topConcentration(slices: AllocationSlice[], n: number): number {
  return slices.slice(0, n).reduce((acc, s) => acc + s.weightPct, 0);
}

export function herfindahlIndex(slices: AllocationSlice[]): number {
  return slices.reduce((acc, s) => acc + (s.weightPct / 100) ** 2, 0);
}

export function effectiveNumberOfPositions(hhi: number): number {
  if (hhi <= 0) return 0;
  return 1 / hhi;
}
