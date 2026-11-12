"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDate } from "@/lib/format";

interface ParsedPosition {
  name: string;
  isin: string | null;
  ticker: string | null;
  exchange: string | null;
  assetClass: string;
  sector: string;
  region: string;
  quantity: number | null;
  purchasePrice: number | null;
  currentPrice: number | null;
  currency: string;
  marketValue: number | null;
  returnPct: number | null;
  dividend: number | null;
  isEtf: boolean;
  warnings: string[];
}

interface ParseResult {
  exportDate: string | null;
  cash: number | null;
  currency: string;
  positions: ParsedPosition[];
  unparsedLines: string[];
  warnings: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedPosition[]>([]);
  const [cash, setCash] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFile(f: File) {
    setBusy(true);
    setError(null);
    setSaved(false);
    setFile(f);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/import/pdf", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Parsen mislukt.");
      setResult(json.result as ParseResult);
      setRows(json.result.positions as ParsedPosition[]);
      setCash(json.result.cash);
      setFileName(f.name);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  function updateRow(i: number, field: keyof ParsedPosition, value: string) {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const numeric = ["quantity", "purchasePrice", "currentPrice", "marketValue", "returnPct", "dividend"].includes(field);
        return { ...r, [field]: numeric ? (value === "" ? null : Number(value.replace(",", "."))) : value };
      })
    );
  }

  async function save() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exportDate: result.exportDate,
          source: "pdf-import",
          fileName,
          cash,
          positions: rows,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Opslaan mislukt.");
      setSaved(true);
      await queryClient.invalidateQueries();
      setTimeout(() => router.push("/"), 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Saxo Investor PDF importeren</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sleep de portefeuille-export hierheen of selecteer een bestand. Niets wordt opgeslagen vóór je bevestigt op
          het validatiescherm.
        </p>
      </div>

      <label
        className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed py-10 text-center transition hover:border-accent"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <span className="text-3xl">📄</span>
        <span className="text-sm text-slate-300">{file ? file.name : "Sleep de PDF hierheen of klik om te selecteren"}</span>
        <span className="text-xs text-slate-500">Alleen .pdf, max 15 MB</span>
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {busy && <div className="card animate-pulse"><p className="text-sm text-slate-500">PDF verwerken…</p></div>}
      {error && <div className="card border-bad/40 bg-bad/10"><p className="text-sm text-bad">⚠️ {error}</p></div>}
      {saved && <div className="card border-good/40 bg-good/10"><p className="text-sm text-good">✓ Snapshot opgeslagen. Je wordt doorgestuurd…</p></div>}

      {result && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="card-title">Validatie vóór opslag</h2>
            <p className="text-sm">
              Exportdatum: <strong className="text-white">{fmtDate(result.exportDate)}</strong> · Cash:{" "}
              <strong className="text-white">{cash != null ? `€ ${cash.toFixed(2)}` : "onbekend"}</strong>
            </p>
            {result.warnings.map((w, i) => (
              <p key={i} className="mt-2 text-xs text-warn">⚠️ {w}</p>
            ))}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-2">Naam</th>
                  <th className="py-2">ISIN</th>
                  <th className="py-2">Aantal</th>
                  <th className="py-2">Aankoopprijs</th>
                  <th className="py-2">Koers</th>
                  <th className="py-2">Waarde</th>
                  <th className="py-2">Valuta</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const broken = r.warnings.length > 0;
                  return (
                    <tr key={i} className={`border-t border-ink-800 ${broken ? "bg-bad/5" : ""}`}>
                      <td className="py-2">
                        <input className="input" value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} />
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-400">{r.isin ?? "onbekend"}</td>
                      <td className="py-2">
                        <input className="input w-24" value={r.quantity ?? ""} onChange={(e) => updateRow(i, "quantity", e.target.value)} />
                      </td>
                      <td className="py-2">
                        <input className="input w-28" value={r.purchasePrice ?? ""} onChange={(e) => updateRow(i, "purchasePrice", e.target.value)} />
                      </td>
                      <td className="py-2">
                        <input className="input w-28" value={r.currentPrice ?? ""} onChange={(e) => updateRow(i, "currentPrice", e.target.value)} />
                      </td>
                      <td className="py-2">
                        <input className="input w-28" value={r.marketValue ?? ""} onChange={(e) => updateRow(i, "marketValue", e.target.value)} />
                      </td>
                      <td className="py-2">
                        <input className="input w-20" value={r.currency} onChange={(e) => updateRow(i, "currency", e.target.value)} />
                      </td>
                      <td className="py-2 text-xs">
                        {broken ? (
                          <span className="text-bad" title={r.warnings.join(" ")}>
                            ⚠️ {r.warnings.length} waarschuwing(en)
                          </span>
                        ) : (
                          <span className="text-good">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.unparsedLines.length > 0 && (
            <div className="card">
              <h2 className="card-title">Niet-geparsede regels</h2>
              <ul className="space-y-1 font-mono text-xs text-slate-500">
                {result.unparsedLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn" onClick={save} disabled={busy || rows.length === 0}>
              Opslaan als snapshot
            </button>
            <button className="btn-secondary" onClick={() => { setResult(null); setRows([]); }}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
