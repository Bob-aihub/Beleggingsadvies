"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DemoBadge, ErrorState, LoadingState } from "@/components/ui";

interface SettingsResponse {
  demo: boolean;
  config: { demoMode: boolean; marketProvider: string; newsProvider: string; llmEnabled: boolean; missingKeys: string[] };
  settings: Record<string, string>;
}

export default function InstellingenPage() {
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Instellingen konden niet geladen worden.");
      return res.json();
    },
  });

  const [benchmark, setBenchmark] = useState("SWDA.AS");
  const [interval, setIntervalMin] = useState("5");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setBenchmark(data.settings.benchmark ?? "SWDA.AS");
      setIntervalMin(data.settings.refreshIntervalMin ?? "5");
    }
  }, [data]);

  if (isLoading) return <LoadingState label="Instellingen laden…" />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  async function save() {
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ benchmark, refreshIntervalMin: interval, benchmarkLabel: benchmark === "SWDA.AS" ? "MSCI World (via SWDA.AS)" : "FTSE All-World (via VWRL.AS)" }),
    });
    setSaved(true);
    await queryClient.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white">Instellingen</h1>
        <DemoBadge demo={data.demo} />
      </div>

      {data.config.demoMode && (
        <div className="card border-warn/40 bg-warn/10">
          <p className="text-sm text-warn">
            <strong>DEMO-modus:</strong> er zijn geen API-sleutels geconfigureerd. De app toont voorbeelddata met een
            DEMO-badge. Voeg sleutels toe in <code className="font-mono">.env</code> en herstart de server.
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
            {data.config.missingKeys.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">API-configuratie (via .env — sleutels worden nooit in de UI bewaard)</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Marktdataprovider</dt><dd className="font-mono text-xs">{data.config.marketProvider}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Nieuwsprovider</dt><dd className="font-mono text-xs">{data.config.newsProvider}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">LLM-samenvattingen</dt><dd className="font-mono text-xs">{data.config.llmEnabled ? "actief" : "uit"}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Zet sleutels in <code className="font-mono">investment-dashboard/.env</code> (zie{" "}
          <code className="font-mono">.env.example</code>): FINNHUB_API_KEY, ALPHAVANTAGE_API_KEY, FINNHUB_NEWS_API_KEY,
          MISTRAL_API_KEY.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Dashboard</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Benchmark</label>
            <select className="input" value={benchmark} onChange={(e) => setBenchmark(e.target.value)}>
              <option value="SWDA.AS">MSCI World (SWDA.AS)</option>
              <option value="VWRL.AS">FTSE All-World (VWRL.AS)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Refresh-interval (minuten)</label>
            <input className="input" type="number" min={1} max={60} value={interval} onChange={(e) => setIntervalMin(e.target.value)} />
          </div>
        </div>
        <button className="btn mt-3" onClick={save}>
          Opslaan
        </button>
        {saved && <span className="ml-3 text-sm text-good">✓ Opgeslagen</span>}
      </div>
    </div>
  );
}
