import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppConfig } from "@/lib/config";
import { buildScorecard, evaluatePrediction, type ScorecardRow } from "@/lib/predictions";
import { getQuote } from "@/lib/market-data";
import { DEMO_POSITIONS } from "@/lib/demo-data";

export async function GET() {
  const config = getAppConfig();
  const predictions = await prisma.prediction.findMany({
    orderBy: { date: "desc" },
    include: { sources: true },
  });

  const tickers = [...new Set(predictions.map((p) => p.ticker))];
  const quotes: Record<string, number | null> = {};
  for (const t of tickers) {
    const q = await getQuote(t);
    quotes[t] = q.price;
  }

  const rows: ScorecardRow[] = predictions
    .filter((p) => quotes[p.ticker] != null)
    .map((p) => ({
      id: p.id,
      ticker: p.ticker,
      horizon: p.horizon,
      evaluation: evaluatePrediction(
        {
          date: p.date,
          expectedPrice: p.expectedPrice,
          expectedPriceLow: p.expectedPriceLow,
          expectedPriceHigh: p.expectedPriceHigh,
          horizon: p.horizon,
          targetDate: p.targetDate,
        },
        quotes[p.ticker]!
      ),
    }));

  const scorecard = buildScorecard(rows);

  return NextResponse.json({
    demo: config.demoMode,
    predictions,
    quotes,
    scorecard,
    scatter: predictions
      .filter((p) => quotes[p.ticker] != null)
      .map((p) => ({
        id: p.id,
        ticker: p.ticker,
        predicted: p.expectedPrice,
        actual: quotes[p.ticker]!,
        horizon: p.horizon,
        origin: p.origin,
      })),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticker?: string;
      name?: string;
      date?: string;
      expectedPrice?: number;
      expectedPriceLow?: number | null;
      expectedPriceHigh?: number | null;
      horizon?: string;
      targetDate?: string | null;
      rationale?: string;
      assumptions?: string | null;
      origin?: string;
      sources?: Array<{ organization: string; title: string; date?: string; type: string; url: string }>;
    };

    if (!body.ticker || !body.expectedPrice || !body.horizon || !body.rationale) {
      return NextResponse.json(
        { error: "Ticker, verwachte koers, horizon en onderbouwing zijn verplicht." },
        { status: 422 }
      );
    }

    const prediction = await prisma.prediction.create({
      data: {
        ticker: body.ticker,
        name: body.name ?? null,
        date: body.date ? new Date(body.date) : new Date(),
        expectedPrice: body.expectedPrice,
        expectedPriceLow: body.expectedPriceLow ?? null,
        expectedPriceHigh: body.expectedPriceHigh ?? null,
        horizon: body.horizon,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        rationale: body.rationale,
        assumptions: body.assumptions ?? null,
        origin: body.origin ?? "MANUAL",
        sources: {
          create:
            body.sources?.map((s) => ({
              organization: s.organization,
              title: s.title,
              date: s.date ? new Date(s.date) : null,
              type: s.type,
              url: s.url,
            })) ?? [],
        },
      },
      include: { sources: true },
    });

    return NextResponse.json({ ok: true, prediction });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
