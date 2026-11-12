import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppConfig } from "@/lib/config";
import { getPriceHistory } from "@/lib/market-data";
import { DEMO_POSITIONS, DEMO_PRICE_HISTORY } from "@/lib/demo-data";

export async function GET() {
  const config = getAppConfig();
  const snapshot = await prisma.snapshot.findFirst({
    orderBy: { date: "desc" },
    include: { positions: true },
  });

  const demo = !snapshot;
  const positions = snapshot
    ? snapshot.positions
    : DEMO_POSITIONS.map((p, i) => ({
        id: `demo-${i}`,
        snapshotId: "demo",
        raw: null,
        exchange: null,
        ...p,
      }));

  return NextResponse.json({ demo, positions });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: string;
      type?: string;
      ticker?: string;
      name?: string;
      quantity?: number;
      price?: number;
      currency?: string;
      fees?: number | null;
      note?: string | null;
    };

    if (!body.type || !body.ticker || !body.quantity || !body.price) {
      return NextResponse.json({ error: "Type, ticker, aantal en prijs zijn verplicht." }, { status: 422 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        type: body.type,
        ticker: body.ticker,
        name: body.name ?? null,
        quantity: body.quantity,
        price: body.price,
        currency: body.currency ?? "EUR",
        fees: body.fees ?? null,
        note: body.note ?? null,
      },
    });

    return NextResponse.json({ ok: true, transaction });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
