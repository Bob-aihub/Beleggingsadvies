import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Investment Dashboard",
  description: "Portefeuilledashboard voor een particuliere belegger in België (Saxo Investor).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
            <Nav />
            <main className="flex-1 px-4 pb-12 pt-6">{children}</main>
            <footer className="border-t border-ink-800 px-4 py-4 text-xs text-slate-500">
              Dit dashboard is een hulpmiddel voor eigen inzicht en geeft geen beleggingsadvies. De gebruiker blijft
              verantwoordelijk; er worden nooit automatisch transacties uitgevoerd. Externe cijfers komen uit
              gecontroleerde bronnen met tijdstempel; niet verifieerbare gegevens worden expliciet gemarkeerd.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
