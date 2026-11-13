import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppConfig } from "@/lib/config";
import { portfolioHealth, riskRadar } from "@/lib/health";
import {
  allocationByAssetClass,
  allocationBySector,
  allocationByRegion,
  allocationByCurrency,
  allocationByPosition,
  topConcentration,
} from "@/lib/allocations";
import { DEMO_POSITIONS, DEMO_CASH, DEMO_BENCHMARK } from "@/lib/demo-data";

export async function GET() {
  const config = getAppConfig();
  let snapshot = await prisma.snapshot.findFirst({
    orderBy: { date: "desc" },
    include: { positions: true },
  });

  let demo = false;
  if (!snapshot) {
    demo = true;
    const now = new Date();
    snapshot = {
      id: "demo",
      date: now,
      source: "demo",
      fileName: null,
      exportDate: now,
      totalValue: DEMO_POSITIONS.reduce((a, p) => a + (p.marketValue ?? 0), 0),
      cash: DEMO_CASH,
      createdAt: now,
      positions: DEMO_POSITIONS.map((p, i) => ({
        id: `demo-${i}`,
        snapshotId: "demo",
        name: p.name,
        isin: p.isin,
        ticker: p.ticker,
        exchange: null,
        assetClass: p.assetClass,
        sector: p.sector,
        region: p.region,
        quantity: p.quantity,
        purchasePrice: p.purchasePrice,
        currentPrice: p.currentPrice,
        currency: p.currency,
        marketValue: p.marketValue,
        returnPct: p.returnPct,
        dividend: p.dividend,
        isEtf: p.isEtf,
        raw: null,
      })),
    } as never;
  }

  const prevSnapshot = await prisma.snapshot.findFirst({
    orderBy: { date: "desc" },
    where: { date: { lt: snapshot.date }, id: { not: snapshot.id } },
  });

  const positions = snapshot.positions;
  const invested = positions.reduce((acc, p) => acc + (p.purchasePrice != null ? p.purchasePrice * p.quantity : 0), 0);
  const totalValue = positions.reduce((acc, p) => acc + (p.marketValue ?? (p.currentPrice ?? 0) * p.quantity), 0);
  const totalReturnEur = totalValue - invested;
  const totalReturnPct = invested > 0 ? (totalReturnEur / invested) * 100 : null;
  const dayChange = prevSnapshot
    ? totalValue - prevSnapshot.totalValue
    : null;

  const settings = await prisma.setting.findMany();
  const benchmarkSetting = settings.find((s) => s.key === "benchmarkLabel")?.value ?? DEMO_BENCHMARK;

  return NextResponse.json({
    demo,
    config: { demoMode: config.demoMode, marketProvider: config.marketProvider, missingKeys: config.missingKeys },
    benchmark: benchmarkSetting,
    snapshot: {
      id: snapshot.id,
      date: snapshot.date,
      exportDate: snapshot.exportDate,
      source: snapshot.source,
      totalValue,
      cash: snapshot.cash,
      invested,
      totalReturnEur,
      totalReturnPct,
      dayChange,
      positionCount: positions.length,
    },
    allocations: {
      assetClass: allocationByAssetClass(positions),
      sector: allocationBySector(positions),
      region: allocationByRegion(positions),
      currency: allocationByCurrency(positions),
      position: allocationByPosition(positions),
      top5: topConcentration(allocationByPosition(positions), 5),
      top10: topConcentration(allocationByPosition(positions), 10),
    },
    health: portfolioHealth(positions),
    risks: riskRadar(positions),
    positions,
  });
}
