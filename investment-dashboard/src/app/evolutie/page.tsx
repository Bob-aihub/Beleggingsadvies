"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DemoBadge, ErrorState, LoadingState, SourceList } from "@/components/ui";
import { fmtEur, fmtDate } from "@/lib/format";

interface EvolutieResponse {
  portfolio: Array<{ date: string; value: number; cash: number }>;
  benchmark: Array<{ date: string; value: number }>;
  benchmarkLabel: string;
  benchmarkDemo: boolean;
  benchmarkSource: string;
}

interface Prediction {
  id: string;
  ticker: string;
  name: string | null;
  date: string;
  expectedPrice: number;
  expectedPriceLow: number | null;
  expectedPriceHigh: number | null;
  horizon: string;
  rationale: string;
  assumptions: string | null;
  origin: string;
  sources: Array<{ organization: string; title: string; date: string | null; type: string; url: string }>;
}

export default function EvolutiePage() {
  const [benchmark, setBenchmark] = useState("SWDA.AS");

  const { data, error, isLoading } = useQuery<EvolutieResponse>({
    queryKey: ["evolutie", benchmark],
    queryFn: async () => {
      const res = await fetch(`/api/evolutie?benchmark=${encodeURIComponent(benchmark)}`);
      if (!res.ok) throw new Error("Evolutiedata kon niet geladen worden.");
      return res.json();
    },
  });

  const { data: predictions } = useQuery<{ predictions: Prediction[] }>({
    queryKey: ["predictions-list"],
    queryFn: async () => {
      const res = await fetch("/api/predictions");
      if (!res.ok) throw new Error("Voorspellingen konden niet geladen worden.");
      return res.json();
    },
  });

  const merged =
    data &&
    Array.from(new Set([...data.portfolio.map((p) => p.date), ...data.benchmark.map((b) => b.date)]))
      .sort()
      .map((date) => ({
        date,
        portefeuille: data.portfolio.find((p) => p.date === date)?.value ?? null,
        benchmark: data.benchmark.find((b) => b.date === date)?.value ?? null,
      }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Evolutie &amp; Verwachtingen</h1>
          {data?.benchmarkDemo && <DemoBadge demo />}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Benchmark:</label>
          <select className="input max-w-48" value={benchmark} onChange={(e) => setBenchmark(e.target.value)}>
            <option value="SWDA.AS">MSCI World (SWDA.AS)</option>
            <option value="VWRL.AS">FTSE All-World (VWRL.AS)</option>
          </select>
        </div>
      </div>

      {isLoading && <LoadingState label="Evolutie laden…" />}
      {error && <ErrorState message={(error as Error).message} />}

      {merged && data && (
        <div className="card">
          <h2 className="card-title" title="Portefeuillewaarde per snapshot, geïndexeerd tegen de gekozen benchmark.">
            Portefeuillewaarde door de tijd
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={merged}>
                <CartesianGrid stroke="#243147" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#141c2b", border: "1px solid #33415c", borderRadius: 8 }}
                  formatter={(v) => (v == null ? ["onbekend", ""] : [fmtEur(Number(v)), ""])}
                />
                <Legend />
                <Line type="monotone" dataKey="portefeuille" stroke="#4f8cff" dot strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="benchmark" stroke="#a78bfa" dot={false} strokeDasharray="4 4" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Benchmark: {data.benchmarkLabel} · Bron: {data.benchmarkSource}
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="card-title" title="Bull/Base/Bear-scenario's met aannames, publicatiedatum en bronlink.">
          Verwachtingspaneel
        </h2>
        {!predictions || predictions.predictions.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen verwachtingen geregistreerd.</p>
        ) : (
          <div className="space-y-3">
            {predictions.predictions.map((p) => (
              <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-850 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-200">
                    {p.name ?? p.ticker} <span className="font-mono text-xs text-slate-500">{p.ticker}</span>
                    {p.origin === "AI" && <span className="ml-2 badge bg-accent/20 text-accent">AI-inschatting</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    {p.horizon} · gepubliceerd {fmtDate(p.date)} · verwacht € {p.expectedPrice.toFixed(2)}
                    {p.expectedPriceLow != null && p.expectedPriceHigh != null
                      ? ` (bereik € ${p.expectedPriceLow.toFixed(2)} – € ${p.expectedPriceHigh.toFixed(2)})`
                      : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{p.rationale}</p>
                {p.assumptions && (
                  <p className="mt-1 text-xs text-slate-500">
                    <strong>Aannames:</strong> {p.assumptions}
                  </p>
                )}
                <div className="mt-3">
                  <SourceList sources={p.sources} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
