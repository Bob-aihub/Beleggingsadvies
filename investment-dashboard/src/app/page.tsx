"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { useState } from "react";
import { KpiCard, DemoBadge, LevelBadge, ErrorState, LoadingState } from "@/components/ui";
import { fmtEur, fmtPct, fmtDate } from "@/lib/format";

interface PortfolioResponse {
  demo: boolean;
  benchmark: string;
  snapshot: {
    date: string;
    exportDate: string | null;
    totalValue: number;
    cash: number;
    invested: number;
    totalReturnEur: number;
    totalReturnPct: number | null;
    dayChange: number | null;
    positionCount: number;
    source: string;
  };
  allocations: {
    assetClass: Array<{ key: string; value: number; weightPct: number }>;
    sector: Array<{ key: string; value: number; weightPct: number }>;
    region: Array<{ key: string; value: number; weightPct: number }>;
    currency: Array<{ key: string; value: number; weightPct: number }>;
    position: Array<{ key: string; value: number; weightPct: number }>;
    top5: number;
    top10: number;
  };
  health: Array<{ label: string; value: string; level: string; explanation: string }>;
  risks: Array<{ risk: string; impact: string; explanation: string }>;
  positions: Array<{ id: string; name: string; ticker: string | null; marketValue: number | null }>;
}

const COLORS = ["#4f8cff", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#38bdf8", "#fb923c", "#4ade80"];

export default function OverzichtPage() {
  const [allocView, setAllocView] = useState<"sector" | "region" | "currency" | "assetClass">("sector");
  const { data, error, isLoading, refetch, isFetching } = useQuery<PortfolioResponse>({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Portefeuille kon niet geladen worden.");
      return res.json();
    },
  });

  if (isLoading) return <LoadingState label="Portefeuille laden…" />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const s = data.snapshot;
  const alloc =
    allocView === "sector"
      ? data.allocations.sector
      : allocView === "region"
        ? data.allocations.region
        : allocView === "currency"
          ? data.allocations.currency
          : data.allocations.assetClass;

  const treemapData = data.allocations.position.map((p, i) => ({
    name: `${p.key} (${p.weightPct.toFixed(0)}%)`,
    size: p.value,
    fill: COLORS[i % COLORS.length],
  }));

  const impactCls = (impact: string) =>
    impact === "hoog" ? "text-bad" : impact === "gemiddeld" ? "text-warn" : "text-slate-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Overzicht</h1>
          <DemoBadge demo={data.demo} />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Snapshot: {fmtDate(s.date)} · Exportdatum: {fmtDate(s.exportDate)} · Bron: {s.source}
          </span>
          <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "…" : "⟳ Verversen"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <KpiCard
          label="Totale waarde"
          value={fmtEur(s.totalValue)}
          tooltip="Som van de marktwaarde van alle posities in de laatste snapshot."
        />
        <KpiCard label="Cash" value={fmtEur(s.cash)} tooltip="Beschikbare middelen volgens de import." />
        <KpiCard
          label="Geïnvesteerd"
          value={fmtEur(s.invested)}
          tooltip="Som van aankoopprijs × aantal; posities zonder aankoopprijs tellen niet mee."
        />
        <KpiCard
          label="Totaalrendement"
          value={`${fmtEur(s.totalReturnEur)} (${fmtPct(s.totalReturnPct)})`}
          tone={s.totalReturnEur >= 0 ? "good" : "bad"}
          tooltip="Marktwaarde minus geïnvesteerd bedrag; onrealiseerd resultaat."
        />
        <KpiCard
          label="Dagverandering"
          value={s.dayChange == null ? "onbekend" : fmtEur(s.dayChange)}
          tone={s.dayChange != null && s.dayChange >= 0 ? "good" : s.dayChange != null ? "bad" : "neutral"}
          tooltip="Verschil met de vorige snapshot; alleen beschikbaar bij minstens twee snapshots."
        />
        <KpiCard label="Posities" value={String(s.positionCount)} tooltip="Aantal posities in de laatste snapshot." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="card-title mb-0" title="Klik op een weergave om te wisselen.">
              Allocatie
            </h2>
            <div className="flex gap-1 text-xs">
              {(["assetClass", "sector", "region", "currency"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setAllocView(v)}
                  className={`rounded px-2 py-1 ${allocView === v ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {v === "assetClass" ? "Klasse" : v === "sector" ? "Sector" : v === "region" ? "Regio" : "Valuta"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={alloc} dataKey="value" nameKey="key" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {alloc.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0b0f17" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#141c2b", border: "1px solid #33415c", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [fmtEur(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            {alloc.map((a, i) => (
              <span key={a.key} className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {a.key}: {a.weightPct.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title" title="Grootte van elke rechthoek = marktwaarde van de positie.">
            Positieverdeling (treemap)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap data={treemapData} dataKey="size" stroke="#0b0f17" fill="#4f8cff" />
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Top 5 concentratie: <strong className="text-slate-300">{data.allocations.top5.toFixed(0)}%</strong> · Top 10:{" "}
            <strong className="text-slate-300">{data.allocations.top10.toFixed(0)}%</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="card-title" title="Elke check toont de waarde én de onderbouwing — geen willekeurige score.">
            Portfolio Health
          </h2>
          <div className="space-y-3">
            {data.health.map((h) => (
              <div key={h.label} className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{h.label}</span>
                  <LevelBadge level={h.level} />
                </div>
                <p className="mt-1 text-xs text-slate-300">{h.value}</p>
                <p className="mt-1 text-xs text-slate-500">{h.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title" title="Actieve risico's op basis van de huidige samenstelling.">
            Risk Radar
          </h2>
          {data.risks.length === 0 ? (
            <p className="text-sm text-slate-500">Geen actieve risico's gedetecteerd op basis van de huidige drempels.</p>
          ) : (
            <div className="space-y-3">
              {data.risks.map((r, i) => (
                <div key={i} className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">{r.risk}</span>
                    <span className={`text-xs font-semibold uppercase ${impactCls(r.impact)}`}>impact: {r.impact}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{r.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Posities</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2">Naam</th>
                <th className="py-2">Ticker</th>
                <th className="py-2 text-right">Marktwaarde</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p) => (
                <tr key={p.id} className="border-t border-ink-800 hover:bg-ink-850">
                  <td className="py-2">
                    <Link href={`/posities/${p.id}`} className="text-accent hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-400">{p.ticker ?? "onbekend"}</td>
                  <td className="py-2 text-right text-slate-200">{fmtEur(p.marketValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
