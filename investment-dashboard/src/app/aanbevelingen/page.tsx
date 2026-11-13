"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DemoBadge, ErrorState, LoadingState, StatementList, SourceList, Collapsible } from "@/components/ui";

interface Recommendation {
  id: string;
  name: string;
  ticker: string;
  isin: string;
  type: string;
  action: string;
  horizon: string;
  horizonLabel: string;
  expectedGrowth: string;
  riskLevel: string;
  valuation: string;
  portfolioFit: string;
  taxNote: string;
  confidence: string;
  statements: Array<{ kind: "FEIT" | "ANALYSE" | "INSCHATTING"; text: string; sourceIndex?: number }>;
  bull: string[];
  bear: string[];
  catalysts: string[];
  sources: Array<{ organization: string; title: string; date: string; type: string; url: string }>;
}

interface RecResponse {
  demo: boolean;
  recommendations: Recommendation[];
  taxReference: { rule: string; why: string; calculation: string; source: string; sourceUrl: string; date: string; uncertainty: string };
}

const TABS = [
  { key: "KORT", label: "Korte termijn (0-6 mnd)" },
  { key: "MIDDELLANG", label: "Middellang (6 mnd-3 j)" },
  { key: "LANG", label: "Lang (3+ j)" },
];

const ACTION_CLS: Record<string, string> = {
  KOPEN: "bg-good/20 text-good",
  BIJKOPEN: "bg-accent/20 text-accent",
  HOUDEN: "bg-warn/20 text-warn",
  OPVOLGEN: "bg-ink-700 text-slate-300",
};

export default function AanbevelingenPage() {
  const [tab, setTab] = useState("KORT");
  const { data, error, isLoading } = useQuery<RecResponse>({
    queryKey: ["recommendations", tab],
    queryFn: async () => {
      const res = await fetch(`/api/recommendations?horizon=${tab}`);
      if (!res.ok) throw new Error("Aanbevelingen konden niet geladen worden.");
      return res.json();
    },
  });

  if (isLoading) return <LoadingState label="Aanbevelingen laden…" />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Aanbevelingen</h1>
          <DemoBadge demo={data.demo} />
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 ${tab === t.key ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
        ⚠️ <strong>Disclaimer:</strong> dit is geen beleggingsadvies. De gebruiker blijft verantwoordelijk; er worden nooit
        automatisch transacties uitgevoerd. Feiten (✅), analyses (🔍) en inschattingen (🎯) zijn strikt gescheiden;
        inschattingen zijn nooit feiten.
      </div>

      {data.recommendations.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-500">
            Geen aanbevelingen voor deze horizon met onderbouwde motivatie. Aanbevelingen zonder onderbouwde motivatie
            verschijnen niet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.recommendations.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{r.name}</h2>
                  <p className="font-mono text-xs text-slate-500">
                    {r.ticker} · {r.isin}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${ACTION_CLS[r.action] ?? "bg-ink-700 text-slate-300"}`}>{r.action}</span>
                  <span className="badge bg-ink-700 text-slate-300">{r.type}</span>
                  <span className={`badge ${r.riskLevel === "laag" ? "bg-good/20 text-good" : r.riskLevel === "gemiddeld" ? "bg-warn/20 text-warn" : "bg-bad/20 text-bad"}`}>
                    risico: {r.riskLevel}
                  </span>
                  <span className={`badge ${r.confidence === "Hoog" ? "bg-good/20 text-good" : r.confidence === "Gemiddeld" ? "bg-warn/20 text-warn" : "bg-bad/20 text-bad"}`}>
                    confidence: {r.confidence}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                  <p className="text-xs uppercase text-slate-500">Horizon &amp; verwachte groei</p>
                  <p className="mt-1 text-slate-300">{r.horizonLabel}</p>
                  <p className="text-xs text-slate-500">{r.expectedGrowth}</p>
                </div>
                <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                  <p className="text-xs uppercase text-slate-500">Waardering &amp; fit met portefeuille</p>
                  <p className="mt-1 text-slate-300">{r.valuation}</p>
                  <p className="text-xs text-slate-500">{r.portfolioFit}</p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Motivatie (verplicht)</h3>
                <StatementList statements={r.statements} sources={r.sources} />
              </div>

              <div className="mt-4">
                <Collapsible title="Bull-argumenten, risico's & katalysators">
                  <div className="grid gap-3 md:grid-cols-3 text-sm">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-good">Bull</p>
                      <ul className="list-disc space-y-1 pl-4 text-slate-400">
                        {r.bull.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-bad">Risico&apos;s / bear</p>
                      <ul className="list-disc space-y-1 pl-4 text-slate-400">
                        {r.bear.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-warn">Katalysators</p>
                      <ul className="list-disc space-y-1 pl-4 text-slate-400">
                        {r.catalysts.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  </div>
                </Collapsible>
              </div>

              <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3">
                <p className="text-xs font-semibold uppercase text-accent">Belgische fiscaliteitsnotitie</p>
                <p className="mt-1 text-xs text-slate-300">{r.taxNote}</p>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Bronnen</h3>
                <SourceList sources={r.sources} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 className="card-title" title="Format: regel → waarom van toepassing → berekening → bron → datum.">
          Belgische fiscaliteit — referentiekader
        </h2>
        <div className="space-y-2 text-sm text-slate-300">
          <p><strong>Regel:</strong> {data.taxReference.rule}</p>
          <p><strong>Waarom van toepassing:</strong> {data.taxReference.why}</p>
          <p><strong>Berekening (voorbeeld):</strong> {data.taxReference.calculation}</p>
          <p>
            <strong>Bron:</strong>{" "}
            <a href={data.taxReference.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {data.taxReference.source}
            </a>{" "}
            (geconsulteerd {data.taxReference.date})
          </p>
          <p className="text-xs text-warn">⚠️ {data.taxReference.uncertainty}</p>
        </div>
      </div>
    </div>
  );
}
