"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { DemoBadge, ErrorState, LoadingState } from "@/components/ui";
import { fmtEur, fmtPct } from "@/lib/format";

interface PositionRow {
  id: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number;
  purchasePrice: number | null;
  currentPrice: number | null;
  currency: string;
  marketValue: number | null;
  returnPct: number | null;
  dividend: number | null;
  assetClass: string;
  sector: string;
  region: string;
  isEtf: boolean;
}

export default function PositiesPage() {
  const { data, error, isLoading } = useQuery<{ demo: boolean; positions: PositionRow[] }>({
    queryKey: ["positions"],
    queryFn: async () => {
      const res = await fetch("/api/positions");
      if (!res.ok) throw new Error("Posities konden niet geladen worden.");
      return res.json();
    },
  });

  const [filter, setFilter] = useState("");

  if (isLoading) return <LoadingState label="Posities laden…" />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const positions = data.positions.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.ticker ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Posities</h1>
          <DemoBadge demo={data.demo} />
        </div>
        <input
          className="input max-w-xs"
          placeholder="Zoek op naam of ticker…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="py-2">Naam</th>
              <th className="py-2">ISIN</th>
              <th className="py-2">Klasse</th>
              <th className="py-2">Sector</th>
              <th className="py-2">Regio</th>
              <th className="py-2 text-right">Aantal</th>
              <th className="py-2 text-right">Aankoop</th>
              <th className="py-2 text-right">Koers</th>
              <th className="py-2 text-right">Waarde</th>
              <th className="py-2 text-right">Rendement</th>
              <th className="py-2 text-right">Dividend</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id} className="border-t border-ink-800 hover:bg-ink-850">
                <td className="py-2">
                  <Link href={`/posities/${p.id}`} className="text-accent hover:underline">
                    {p.name}
                  </Link>
                  {p.isEtf && <span className="ml-2 badge bg-accent/20 text-accent">ETF</span>}
                </td>
                <td className="py-2 font-mono text-xs text-slate-500">{p.isin ?? "onbekend"}</td>
                <td className="py-2 text-slate-400">{p.assetClass}</td>
                <td className="py-2 text-slate-400">{p.sector}</td>
                <td className="py-2 text-slate-400">{p.region}</td>
                <td className="py-2 text-right text-slate-200">{p.quantity}</td>
                <td className="py-2 text-right text-slate-400">{fmtEur(p.purchasePrice)}</td>
                <td className="py-2 text-right text-slate-200">{fmtEur(p.currentPrice)}</td>
                <td className="py-2 text-right text-slate-200">{fmtEur(p.marketValue)}</td>
                <td className={`py-2 text-right ${(p.returnPct ?? 0) >= 0 ? "text-good" : "text-bad"}`}>
                  {fmtPct(p.returnPct)}
                </td>
                <td className="py-2 text-right text-slate-400">{fmtEur(p.dividend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Velden tonen “onbekend” wanneer de waarde niet in de PDF of een gecontroleerde externe bron staat.
      </p>
    </div>
  );
}
