import { NextResponse } from "next/server";
import { parsePdfBuffer } from "@/lib/pdf-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Alleen PDF-bestanden worden ondersteund." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Bestand is te groot (max 15 MB)." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parsePdfBuffer(buffer);
    return NextResponse.json({ ok: true, fileName: file.name, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij het lezen van de PDF.";
    return NextResponse.json(
      { error: `PDF kon niet gelezen worden: ${message}. Controleer of dit een Saxo Investor portefeuille-export is.` },
      { status: 422 }
    );
  }
}
