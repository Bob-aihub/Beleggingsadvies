import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppConfig } from "@/lib/config";
import { DEMO_NEWS } from "@/lib/demo-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const config = getAppConfig();
  const demo = config.newsProvider === "demo";

  if (demo) {
    const items = ticker ? DEMO_NEWS.filter((n) => n.ticker === ticker) : DEMO_NEWS;
    return NextResponse.json({
      demo: true,
      note: "Geen nieuws-API-sleutel geconfigureerd: toont voorbeelddata.",
      items,
    });
  }

  const items = await prisma.newsItem.findMany({
    where: ticker ? { ticker } : {},
    orderBy: { publishedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ demo: false, items });
}
