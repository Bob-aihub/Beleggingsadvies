"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { DemoBadge, ErrorState, LoadingState, SourceList } from "@/components/ui";
import { fmtEur, fmtPct, fmtDate } from "@/lib/format";

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

interface ScorecardResponse {
  demo: boolean;
  predictions: Prediction[];
  quotes: Record<string, number | null>;
  scorecard: {
    count: number;
    hitRatio: number;
    avgDeviationPct: number;
    best: { ticker: string; evaluation: { deviationPct: number } } | null;
    worst: { ticker: string; evaluation: { deviationPct: number } } | null;
    calibration: Array<{ horizon: string; count: number; hitRatio: number; avgDeviationPct: number; color: string }>;
  };
  scatter: Array<{ id: string; ticker: string; predicted: number; actual: number; horizon: string; origin: string }>;
}

const HORIZON_LABEL: Record<string, string> = {
  KORT: "Kort (0-6 mnd)",
  MIDDELLANG: "Middellang (6 mnd-3 j)",
  LANG: "Lang (3+ j)",
};

export default function VoorspellingenPage() {
  const queryClient = useQueryClient();
  const { data, error, isLoading, refetch, isFetching } = useQuery<ScorecardResponse>({
    queryKey: ["predictions"],
    queryFn: async () => {
      const res = await fetch("/api/predictions");
      if (!res.ok) throw new Error("Voorspellingen konden niet geladen worden.");
      return res.json();
    },
  });

  const [form, setForm] = useState({ ticker: "", expectedPrice: "", low: "", high: "", horizon: "KORT", rationale: "", assumptions: "", sourceOrg: "", sourceTitle: "", sourceUrl: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) return <LoadingState label="Voorspellingen laden…" />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  async function submit() {
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker,
          expectedPrice: Number(form.expectedPrice.replace(",", ".")),
          expectedPriceLow: form.low ? Number(form.low.replace(",", ".")) : null,
          expectedPriceHigh: form.high ? Number(form.high.replace(",", ".")) : null,
          horizon: form.horizon,
          rationale: form.rationale,
          assumptions: form.assumptions || null,
          origin: "MANUAL",
          sources: form.sourceOrg && form.sourceTitle && form.sourceUrl
            ? [{ organization: form.sourceOrg, title: form.sourceTitle, type: "nieuws", url: form.sourceUrl }]
            : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Opslaan mislukt.");
      setForm({ ticker: "", expectedPrice: "", low: "", high: "", horizon: "KORT", rationale: "", assumptions: "", sourceOrg: "", sourceTitle: "", sourceUrl: "" });
      await queryClient.invalidateQueries({ queryKey: ["predictions"] });
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const colorCls = (c: string) => (c === "groen" ? "text-good" : c === "amber" ? "text-warn" : "text-bad");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Voorspellingen vs. Realiteit</h1>
          <DemoBadge demo={data.demo} />
        </div>
        <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "…" : "⟳ Verversen"}
        </button>
      </div>

      {data.scorecard.count === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-500">
            Nog geen voorspellingen geëvalueerd. Voeg hieronder een voorspelling toe — de scorekaart vergelijkt ze
            automatisch met de actuele koersen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card">
            <div className="text-xs uppercase text-slate-500">Hitratio</div>
            <div className="text-2xl font-bold text-white">{(data.scorecard.hitRatio * 100).toFixed(0)}%</div>
            <div className="text-xs text-slate-500">{data.scorecard.count} voorspellingen</div>
          </div>
          <div className="card">
            <div className="text-xs uppercase text-slate-500">Gemiddelde afwijking</div>
            <div className={`text-2xl font-bold ${colorCls(Math.abs(data.scorecard.avgDeviationPct) <= 10 ? "groen" : Math.abs(data.scorecard.avgDeviationPct) <= 20 ? "amber" : "rood")}`}>
              {fmtPct(data.scorecard.avgDeviationPct)}
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase text-slate-500">Beste voorspelling</div>
            <div className="text-lg font-bold text-good">
              {data.scorecard.best ? `${data.scorecard.best.ticker} ${fmtPct(data.scorecard.best.evaluation.deviationPct)}` : "—"}
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase text-slate-500">Slechtste voorspelling</div>
            <div className="text-lg font-bold text-bad">
              {data.scorecard.worst ? `${data.scorecard.worst.ticker} ${fmtPct(data.scorecard.worst.evaluation.deviationPct)}` : "—"}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="card-title" title="Elke stip: voorspelde koers (x) vs. effectieve koers (y). Op de diagonaal = exact juist.">
            Voorspeld vs. effectief
          </h2>
          {data.scatter.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen evaluaties beschikbaar.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid stroke="#243147" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="predicted" name="Voorspeld" stroke="#64748b" fontSize={11} />
                  <YAxis type="number" dataKey="actual" name="Effectief" stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#141c2b", border: "1px solid #33415c", borderRadius: 8 }}
                    formatter={(v: number, name: string) => [fmtEur(v), name]}
                  />
                  <ReferenceLine
                    segment={[
                      { x: Math.min(...data.scatter.map((s) => s.predicted)), y: Math.min(...data.scatter.map((s) => s.predicted)) },
                      { x: Math.max(...data.scatter.map((s) => s.predicted)), y: Math.max(...data.scatter.map((s) => s.predicted)) },
                    ]}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                  />
                  <Scatter data={data.scatter} fill="#4f8cff" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title" title="Calibratie per horizon: hitratio en gemiddelde afwijking, met kleurcodering groen/amber/rood.">
            Calibratie per horizon
          </h2>
          {data.scorecard.calibration.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-2">Horizon</th>
                  <th className="py-2 text-right">Aantal</th>
                  <th className="py-2 text-right">Hitratio</th>
                  <th className="py-2 text-right">Gem. afwijking</th>
                </tr>
              </thead>
              <tbody>
                {data.scorecard.calibration.map((c) => (
                  <tr key={c.horizon} className="border-t border-ink-800">
                    <td className="py-2 text-slate-300">{HORIZON_LABEL[c.horizon] ?? c.horizon}</td>
                    <td className="py-2 text-right text-slate-400">{c.count}</td>
                    <td className={`py-2 text-right font-semibold ${colorCls(c.color)}`}>{(c.hitRatio * 100).toFixed(0)}%</td>
                    <td className="py-2 text-right text-slate-300">{fmtPct(c.avgDeviationPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Alle voorspellingen</h2>
        <div className="space-y-3">
          {data.predictions.map((p) => {
            const actual = data.quotes[p.ticker];
            const dev = actual != null ? ((actual - p.expectedPrice) / p.expectedPrice) * 100 : null;
            return (
              <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-850 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-200">
                    {p.name ?? p.ticker} <span className="font-mono text-xs text-slate-500">{p.ticker}</span>
                    {p.origin === "AI" && <span className="ml-2 badge bg-accent/20 text-accent">AI-inschatting</span>}
                  </span>
                  <span className={`text-xs font-semibold ${dev == null ? "text-slate-500" : dev >= -5 && dev <= 5 ? "text-good" : dev >= -15 && dev <= 15 ? "text-warn" : "text-bad"}`}>
                    {dev == null ? "effectieve koers onbekend" : `${fmtPct(dev)} t.o.v. verwacht`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Voorspeld op {fmtDate(p.date)}: € {p.expectedPrice.toFixed(2)}
                  {p.expectedPriceLow != null && p.expectedPriceHigh != null
                    ? ` (bereik € ${p.expectedPriceLow.toFixed(2)} – € ${p.expectedPriceHigh.toFixed(2)})`
                    : ""}{" "}
                  · horizon {HORIZON_LABEL[p.horizon] ?? p.horizon} · effectief nu: {fmtEur(actual)}
                </p>
                <p className="mt-2 text-sm text-slate-300">{p.rationale}</p>
                {p.assumptions && <p className="mt-1 text-xs text-slate-500"><strong>Aannames:</strong> {p.assumptions}</p>}
                <div className="mt-3">
                  <SourceList sources={p.sources} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title" title="Handmatige voorspelling; de onderbouwing en bronnen zijn verplicht zodat deze traceerbaar blijft.">
          Voorspelling toevoegen
        </h2>
        {formError && <p className="mb-3 text-sm text-bad">⚠️ {formError}</p>}
        <div className="grid gap-3 md:grid-cols-3">
          <input className="input" placeholder="Ticker (bijv. ASML.AS)" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
          <input className="input" placeholder="Verwachte koers" value={form.expectedPrice} onChange={(e) => setForm({ ...form, expectedPrice: e.target.value })} />
          <select className="input" value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value })}>
            <option value="KORT">Kort (0-6 mnd)</option>
            <option value="MIDDELLANG">Middellang (6 mnd-3 j)</option>
            <option value="LANG">Lang (3+ j)</option>
          </select>
          <input className="input" placeholder="Ondergrens (optioneel)" value={form.low} onChange={(e) => setForm({ ...form, low: e.target.value })} />
          <input className="input" placeholder="Bovengrens (optioneel)" value={form.high} onChange={(e) => setForm({ ...form, high: e.target.value })} />
          <input className="input" placeholder="Aannames (optioneel)" value={form.assumptions} onChange={(e) => setForm({ ...form, assumptions: e.target.value })} />
          <input className="input md:col-span-3" placeholder="Onderbouwing (verplicht)" value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} />
          <input className="input" placeholder="Bron: organisatie" value={form.sourceOrg} onChange={(e) => setForm({ ...form, sourceOrg: e.target.value })} />
          <input className="input" placeholder="Bron: titel" value={form.sourceTitle} onChange={(e) => setForm({ ...form, sourceTitle: e.target.value })} />
          <input className="input" placeholder="Bron: URL" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
        </div>
        <button className="btn mt-3" onClick={submit} disabled={saving || !form.ticker || !form.expectedPrice || !form.rationale}>
          {saving ? "Opslaan…" : "Voorspelling opslaan"}
        </button>
      </div>
    </div>
  );
}
