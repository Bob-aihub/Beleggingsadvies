import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPriceHistory } from "@/lib/market-data";
import { DEMO_POSITIONS } from "@/lib/demo-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const benchmark = searchParams.get("benchmark") || "SWDA.AS";

  const snapshots = await prisma.snapshot.findMany({ orderBy: { date: "asc" } });

  const portfolioSeries = snapshots.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    value: s.totalValue,
    cash: s.cash,
  }));

  const bench = await getPriceHistory(benchmark);
  const benchBase = bench.points[0]?.close;
  const portfolioBase = portfolioSeries[0]?.value;

  const benchmarkSeries =
    benchBase && portfolioBase
      ? bench.points.map((p) => ({
          date: p.date,
          value: (p.close / benchBase) * portfolioBase,
        }))
      : [];

  return NextResponse.json({
    portfolio: portfolioSeries,
    benchmark: benchmarkSeries,
    benchmarkLabel: benchmark,
    benchmarkDemo: bench.demo,
    benchmarkSource: bench.source,
  });
}
