"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { DemoBadge, ErrorState, LoadingState, SourceList } from "@/components/ui";
import { fmtEur, fmtDate, fmtDateTime, fmtNum, fmtPct } from "@/lib/format";

interface DetailResponse {
  demo: boolean;
  position: {
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
    sector: string;
    region: string;
    assetClass: string;
    peRatio?: number | null;
  };
  quote: { price: number | null; currency: string; changePctDay: number | null; fetchedAt: string; source: string; demo: boolean; note?: string } | null;
  history: { points: Array<{ date: string; close: number }>; demo: boolean; source: string };
  news: Array<{ id: string; title: string; summary: string | null; source: string; url: string; publishedAt: string; sentiment: string | null }>;
  fundamentalsNote: string | null;
}

const RANGES = [
  { key: "1M", months: 1 },
  { key: "3M", months: 3 },
  { key: "6M", months: 6 },
  { key: "1J", months: 12 },
  { key: "3J", months: 36 },
  { key: "5J", months: 60 },
  { key: "max", months: 1200 },
];

export default function PositionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [range, setRange] = useState("max");

  const { data, error, isLoading } = useQuery<DetailResponse>({
    queryKey: ["position", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/positions/${id}`);
      if (!res.ok) throw new Error("Positie kon niet geladen worden.");
      return res.json();
    },
  });

  if (isLoading) return <LoadingState label="Positie laden…" />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const p = data.position;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RANGES.find((r) => r.key === range)!.months);
  const points = data.history.points.filter((pt) => new Date(pt.date) >= cutoff);

  const newsByDate = new Map<string, string>();
  for (const n of data.news) newsByDate.set(n.publishedAt.slice(0, 10), n.title);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">{p.name}</h1>
          <DemoBadge demo={data.demo} />
        </div>
        <div className="flex gap-1 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded px-2 py-1 ${range === r.key ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="card-title" title="Koersverloop uit de marktdataprovider of voorbeelddata; nieuwsgebeurtenissen als markers.">
            Koersgrafiek {range}
          </h2>
          {points.length === 0 ? (
            <p className="text-sm text-slate-500">Geen koersgeschiedenis beschikbaar voor deze positie.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points}>
                  <CartesianGrid stroke="#243147" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#141c2b", border: "1px solid #33415c", borderRadius: 8 }}
                    formatter={(v: number) => [fmtEur(v), "Koers"]}
                  />
                  <Line type="monotone" dataKey="close" stroke="#4f8cff" dot={false} strokeWidth={2} />
                  {points
                    .filter((pt) => newsByDate.has(pt.date))
                    .map((pt, i) => (
                      <ReferenceDot key={i} x={pt.date} y={pt.close} r={5} fill="#fbbf24" stroke="#0b0f17" />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Bron: {data.history.source} · Geel = nieuwsgebeurtenis · Laatst bijgewerkt:{" "}
            {data.quote ? fmtDateTime(data.quote.fetchedAt) : "onbekend"}
          </p>
        </div>

        <div className="card">
          <h2 className="card-title">Kenmerken</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Ticker / ISIN</dt><dd className="font-mono text-xs">{p.ticker ?? "onbekend"} / {p.isin ?? "onbekend"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Aantal</dt><dd>{p.quantity}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Aankoopprijs</dt><dd>{fmtEur(p.purchasePrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Huidige koers</dt><dd>{fmtEur(data.quote?.price ?? p.currentPrice)} {data.quote?.currency ?? p.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Dagverandering</dt><dd>{fmtPct(data.quote?.changePctDay ?? null)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Marktwaarde</dt><dd>{fmtEur(p.marketValue)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Rendement</dt><dd>{fmtPct(p.returnPct)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Dividend (laatst)</dt><dd>{fmtEur(p.dividend)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">K/W</dt><dd>{fmtNum(p.peRatio ?? null)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Sector / regio</dt><dd>{p.sector} / {p.region}</dd></div>
          </dl>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="card-title" title="Recent nieuws uit de nieuws-API met bron, datum en sentiment.">
            Recent nieuws
          </h2>
          {data.news.length === 0 ? (
            <p className="text-sm text-slate-500">Geen nieuws beschikbaar.</p>
          ) : (
            <ul className="space-y-3">
              {data.news.map((n) => (
                <li key={n.id} className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                  <a href={n.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                    {n.title}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">
                    {n.source} · {fmtDate(n.publishedAt)} ·{" "}
                    <span className={n.sentiment === "positief" ? "text-good" : n.sentiment === "negatief" ? "text-bad" : "text-slate-400"}>
                      sentiment: {n.sentiment ?? "onbekend"}
                    </span>
                  </p>
                  {n.summary && <p className="mt-1 text-xs text-slate-400">{n.summary}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Investment thesis &amp; verwachtingen</h2>
          <p className="text-sm text-slate-400">
            De investment thesis per positie wordt opgebouwd uit de verwachtingspaneel-scenario&apos;s (Bull/Base/Bear),
            analyst-consensus en markttendensen. Zie{" "}
            <a href="/evolutie" className="text-accent hover:underline">
              Evolutie &amp; Verwachtingen
            </a>
            .
          </p>
          {data.fundamentalsNote && <p className="mt-3 text-xs italic text-warn">{data.fundamentalsNote}</p>}
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Scenario-aannames (bronnen)</h3>
            <SourceList
              sources={[
                {
                  organization: "Marktdataprovider",
                  title: "Koersen en consensus (zie Instellingen voor provider)",
                  date: data.quote?.fetchedAt ?? null,
                  type: "databank",
                  url: data.quote?.demo ? "https://finnhub.io/docs/api" : "https://finnhub.io/docs/api",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
