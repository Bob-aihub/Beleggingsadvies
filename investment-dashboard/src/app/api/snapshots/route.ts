import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const snapshots = await prisma.snapshot.findMany({
    orderBy: { date: "asc" },
    include: { positions: true },
  });
  return NextResponse.json({ snapshots });
}

interface IncomingPosition {
  name?: string;
  isin?: string | null;
  ticker?: string | null;
  exchange?: string | null;
  assetClass?: string;
  sector?: string;
  region?: string;
  quantity?: number | null;
  purchasePrice?: number | null;
  currentPrice?: number | null;
  currency?: string;
  marketValue?: number | null;
  returnPct?: number | null;
  dividend?: number | null;
  isEtf?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: string;
      exportDate?: string | null;
      source?: string;
      fileName?: string | null;
      cash?: number | null;
      positions?: IncomingPosition[];
    };

    const incoming = body.positions ?? [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: "Geen posities om op te slaan." }, { status: 400 });
    }

    const invalid = incoming.filter((p) => !p.name || p.quantity == null);
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} rij(en) missen naam of aantal. Vul eerst alle gemarkeerde velden in.` },
        { status: 422 }
      );
    }

    const date = body.date ? new Date(body.date) : new Date();
    const totalValue = incoming.reduce((acc, p) => {
      const v = p.marketValue ?? (p.currentPrice != null ? p.currentPrice * (p.quantity ?? 0) : 0);
      return acc + (v ?? 0);
    }, 0);

    const snapshot = await prisma.snapshot.create({
      data: {
        date,
        source: body.source ?? "pdf-import",
        fileName: body.fileName ?? null,
        exportDate: body.exportDate ? new Date(body.exportDate) : null,
        totalValue,
        cash: body.cash ?? 0,
        positions: {
          create: incoming.map((p) => ({
            name: p.name!,
            isin: p.isin ?? null,
            ticker: p.ticker ?? null,
            exchange: p.exchange ?? null,
            assetClass: p.assetClass ?? "onbekend",
            sector: p.sector ?? "onbekend",
            region: p.region ?? "onbekend",
            quantity: p.quantity ?? 0,
            purchasePrice: p.purchasePrice ?? null,
            currentPrice: p.currentPrice ?? null,
            currency: p.currency ?? "EUR",
            marketValue: p.marketValue ?? null,
            returnPct: p.returnPct ?? null,
            dividend: p.dividend ?? null,
            isEtf: p.isEtf ?? false,
          })),
        },
      },
      include: { positions: true },
    });

    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
