import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppConfig } from "@/lib/config";
import { getQuote, getPriceHistory } from "@/lib/market-data";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const config = getAppConfig();

  let position = null;
  if (id.startsWith("demo-")) {
    const { DEMO_POSITIONS } = await import("@/lib/demo-data");
    const idx = Number(id.replace("demo-", ""));
    position = DEMO_POSITIONS[idx] ?? null;
  } else {
    position = await prisma.snapshotPosition.findUnique({
      where: { id },
      include: { snapshot: { select: { date: true, exportDate: true } } },
    });
  }

  if (!position) {
    return NextResponse.json({ error: "Positie niet gevonden." }, { status: 404 });
  }

  const ticker = position.ticker;
  const quote = ticker ? await getQuote(ticker) : null;
  const history = ticker ? await getPriceHistory(ticker) : { points: [], demo: true, source: "onbekend" };

  const news = await prisma.newsItem.findMany({
    where: ticker ? { ticker } : {},
    orderBy: { publishedAt: "desc" },
    take: 10,
  });

  const positionWithPe = position as typeof position & { peRatio?: number | null };
  return NextResponse.json({
    demo: config.demoMode,
    position,
    quote,
    history,
    news,
    fundamentalsNote:
      positionWithPe.peRatio == null
        ? "Fundamentals (K/W, EPS) zijn niet betrouwbaar verifieerbaar met de huidige configuratie."
        : null,
  });
}
