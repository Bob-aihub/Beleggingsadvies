"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overzicht" },
  { href: "/posities", label: "Posities" },
  { href: "/evolutie", label: "Evolutie & Verwachtingen" },
  { href: "/voorspellingen", label: "Voorspellingen vs. Realiteit" },
  { href: "/aanbevelingen", label: "Aanbevelingen" },
  { href: "/import", label: "Import" },
  { href: "/instellingen", label: "Instellingen" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-ink-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          📈 Investment Dashboard
        </Link>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? "bg-accent/20 text-accent" : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
