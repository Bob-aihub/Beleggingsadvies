"use client";

import { useState } from "react";

export function DemoBadge({ demo }: { demo: boolean }) {
  if (!demo) return null;
  return (
    <span className="badge bg-warn/20 text-warn" title="Toont voorbeelddata omdat geen API-sleutels geconfigureerd zijn.">
      DEMO
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-white";
  return (
    <div className="card" title={tooltip}>
      <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
        {tooltip && <span className="tooltip-info" title={tooltip}>ⓘ</span>}
      </div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "goed"
      ? "bg-good/20 text-good"
      : level === "let op"
        ? "bg-warn/20 text-warn"
        : level === "risico"
          ? "bg-bad/20 text-bad"
          : "bg-ink-700 text-slate-400";
  return <span className={`badge ${cls}`}>{level}</span>;
}

export function SourceList({
  sources,
}: {
  sources: Array<{ organization: string; title: string; date?: string | null; type: string; url: string }>;
}) {
  if (!sources || sources.length === 0) {
    return <p className="text-xs italic text-slate-500">Geen bronnen geregistreerd.</p>;
  }
  return (
    <ul className="space-y-1.5 text-xs text-slate-400">
      {sources.map((s, i) => (
        <li key={i}>
          <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            [{s.organization}] {s.title}
          </a>
          <span className="ml-1 text-slate-500">
            — {s.type}
            {s.date ? `, ${new Date(s.date).toLocaleDateString("nl-BE")}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StatementList({
  statements,
  sources,
}: {
  statements: Array<{ kind: "FEIT" | "ANALYSE" | "INSCHATTING"; text: string; sourceIndex?: number }>;
  sources: Array<{ organization: string }>;
}) {
  const icon = { FEIT: "✅", ANALYSE: "🔍", INSCHATTING: "🎯" } as const;
  const color = { FEIT: "text-good", ANALYSE: "text-accent", INSCHATTING: "text-warn" } as const;
  return (
    <ul className="space-y-1.5 text-sm">
      {statements.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className={color[s.kind]} title={s.kind}>
            {icon[s.kind]}
          </span>
          <span className="text-slate-300">
            {s.text}
            {s.sourceIndex != null && sources[s.sourceIndex] && (
              <span className="ml-1 text-xs text-slate-500">[{sources[s.sourceIndex].organization}]</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-bad/40 bg-bad/10">
      <p className="text-sm text-bad">⚠️ {message}</p>
    </div>
  );
}

export function LoadingState({ label = "Laden…" }: { label?: string }) {
  return (
    <div className="card animate-pulse">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="btn-secondary text-xs">
        {open ? "▲" : "▼"} {title}
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
