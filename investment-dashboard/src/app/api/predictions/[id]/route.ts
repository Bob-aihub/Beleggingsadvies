import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const existing = await prisma.prediction.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Voorspelling niet gevonden." }, { status: 404 });
  await prisma.prediction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
