# Investment Dashboard

Webapplicatie voor een particuliere belegger in België die belegt via Saxo Investor.
Donker-thema dashboard in het Nederlands, gebouwd met Next.js (App Router), TypeScript,
Tailwind CSS, Recharts, React Query, Zustand en Prisma/SQLite.

> **Disclaimer:** dit dashboard is een hulpmiddel voor eigen inzicht en geeft geen
> beleggingsadvies. De gebruiker blijft verantwoordelijk; er worden nooit automatisch
> transacties uitgevoerd.

## Functionaliteit

| Module | Pagina | Inhoud |
| --- | --- | --- |
| Overzicht | `/` | KPI's (totale waarde, cash, geïnvesteerd, rendement, dagverandering), allocatie (donut + treemap), Portfolio Health met uitleg, Risk Radar, positietabel |
| Posities | `/posities`, `/posities/[id]` | Tabel met alle posities; detailweergave met koersgrafiek (1M/3M/6M/1J/3J/5J/max), nieuws-markers, kenmerken, thesisverwijzing |
| Import | `/import` | Saxo Investor PDF uploaden (drag & drop), server-side parsing via `pdf-parse`, validatiescherm vóór opslag (bewerkbare rijen, waarschuwingen per rij, niet-geparsede regels), opslaan als snapshot |
| Evolutie & Verwachtingen | `/evolutie` | Portefeuillewaarde door de tijd (snapshots) met benchmarkvergelijking; verwachtingspaneel met Bull/Base/Bear, aannames, publicatiedatum en bronlinks |
| Voorspellingen vs. Realiteit | `/voorspellingen` | Scorekaart (hitratio, gemiddelde afwijking, beste/slechtste), calibratie per horizon met kleurcodering, scatterplot voorspeld vs. effectief, voorspelling toevoegen (handmatig of als "AI-inschatting") |
| Aanbevelingen | `/aanbevelingen` | Drie tabbladen (kort 0-6 mnd, middellang 6 mnd-3 j, lang 3+ j); kaarten met actie, risico, waardering, portefeuillefit, Belgische fiscaliteitsnotitie, verplichte motivatie en bronnenlijst |
| Instellingen | `/instellingen` | API-configuratiestatus, benchmarkkeuze, refresh-interval |

### Anti-hallucinatieregels (doorsnijdend)

- Alle externe cijfers komen uit een API of geverifieerde bron met datum; cache met
  tijdstempel en "laatst bijgewerkt"-weergave.
- Niet verifieerbare gegevens worden getoond als **"onbekend"** of
  **"Kan momenteel niet betrouwbaar verifiëren"** — nooit aangevuld met gokken.
  De PDF-parser verzint nooit posities, koersen of aankoopprijzen.
- Elke getoonde bron is klikbaar; bronnen die niet geraadpleegd zijn, worden niet getoond.
- Aanbevelingen scheiden strikt ✅ FEIT / 🔍 ANALYSE / 🎯 INSCHATTING, met confidence-label
  (Hoog/Gemiddeld/Laag). Aanbevelingen zonder onderbouwde motivatie verschijnen niet.
- Conflicterende nieuwsbronnen worden naast elkaar getoond, nooit verborgen.
- Zonder API-sleutels draait de app in **DEMO-modus** met voorbeelddata en een duidelijke
  **DEMO**-badge.

## Installatie

```bash
cd investment-dashboard
npm install
cp .env.example .env        # gewenste sleutels invullen (optioneel)
npm run setup               # prisma db push + seed met demodata
npm run dev                 # http://localhost:3000
```

Productiebuild: `npm run build && npm start`.
Tests: `npm test` (vitest).

### Deployen op Vercel (gratis)

Op Vercel is het bestandssysteem tijdelijk; SQLite werkt daar niet. De app gebruikt op
Vercel daarom PostgreSQL via een gratis Neon-database (of Vercel Postgres).

1. Maak een gratis database aan op [neon.tech](https://neon.tech) (of gebruik Vercel
   Postgres) en kopieer de connection string, bijv.
   `postgresql://user:password@host/dbname?sslmode=require`.
2. Ga naar [vercel.com](https://vercel.com), log in met GitHub en klik op
   **Add New… → Project → Import** `Bob-aihub/Beleggingsadvies`.
3. Zet in de projectinstellingen **Root Directory** op `investment-dashboard`.
4. Voeg onder **Environment Variables** toe:
   - `DATABASE_URL` = de Neon/Vercel Postgres connection string
   - optioneel: `FINNHUB_API_KEY`, `FINNHUB_NEWS_API_KEY`, `MISTRAL_API_KEY`
5. Klik **Deploy**. Het buildcommando (uit `vercel.json`) genereert de Prisma Client voor
   PostgreSQL en zet het schema automatisch op de database. Zonder API-sleutels start de
   app in DEMO-modus; seed daarna eenmalig met:

   ```bash
   DATABASE_URL="<neon-url>" npx prisma db push --schema prisma/schema.postgres.prisma
   DATABASE_URL="<neon-url>" npm run db:seed
   ```

   De seed is veilig: met bestaande data doet hij niets tenzij je `FORCE_SEED=1` gebruikt
   (dat wist bestaande snapshots — dus niet doen op een database met echte imports).

Lokaal blijft SQLite werken zoals hierboven; het cloud-schema staat in
`prisma/schema.postgres.prisma` en wordt alleen door het Vercel-buildcommando gebruikt.

### .env-variabelen

| Variabele | Verplicht | Doel |
| --- | --- | --- |
| `DATABASE_URL` | ja | SQLite-pad, standaard `file:./dev.db` |
| `FINNHUB_API_KEY` | nee | Koersen/koersgeschiedenis (Finnhub); zonder sleutel → DEMO |
| `ALPHAVANTAGE_API_KEY` | nee | Alternatieve marktdataprovider |
| `FINNHUB_NEWS_API_KEY` | nee | Bedrijfsnieuws; zonder sleutel → demo-nieuwslijst |
| `MISTRAL_API_KEY` | nee | Optionele LLM-samenvattingen |

Zonder sleutels start de app gewoon en toont overal een DEMO-badge met voorbeelddata.

## PDF-formaat

De parser verwacht de tekstuele portefeuille-export uit Saxo Investor (Afdrukken → PDF).
Herkenning gebeurt op basis van:

- **Exportdatum** — regels met `Export(datum)`, `Datum`, `Date` of `Gegenereerd` gevolgd door
  `dd-mm-jjjj`, `jjjj-mm-dd` of `dd/mm/jjjj`.
- **Cash** — regels met `Beschikbare middelen`, `Available funds`, `Cash` of `Contant`.
- **Posities** — elke regel die een geldig **ISIN** bevat (`2 letters + 9 alfanumeriek + 1 cijfer`),
  gevolgd door getallen in de volgorde *aantal, aankoopprijs, huidige koers, waarde, rendement %, dividend*.
  Europese notatie (`1.234,56`) wordt ondersteund.
- Regels zonder ISIN of zonder herkenbare getallen verschijnen in het validatiescherm als
  **"niet correct geparsed"** en moeten handmatig worden aangevuld.

Voorbeeldregel die correct geparsed wordt:

```
ASML Holding    NL0010273215    8    610,00    705,40    5.643,20    +15,6%
```

Omdat Saxo-exportformaten per regio/versie verschillen, is het validatiescherm leidend:
 controleer elke rij vóór opslag. Sector/regio-classificatie is een heuristiek op naam
 en wordt gemarkeerd als indicatie.

## Beperkingen

- Koersgeschiedenis en fundamentals zijn in DEMO-modus beperkte voorbeeldreeksen.
- ETF-holdings (voor exacte ETF/aandeel-overlap) zijn niet gratis verifieerbaar; de
  overlapcheck is een indicatie op basis van sector/regio en zegt dit expliciet.
- Analyst-consensus en koersdoelen vereisen een marktdataprovider-sleutel; zonder sleutel
  toont de app "onbekend" in plaats van verzonnen consensus.
- Dividendhistoriek per positie komt nu uit de import; automatisch ophalen is een volgende iteratie.
- Belastingtarieven wijzigen; de fiscale notities verwijzen naar de FOD Financiën en geven
  expliciet onzekerheid weer. Geen belastingadvies.
- De parser is een eerste versie getest op een representatief Saxo-formaat; afwijkende exports
  vereisen handmatige correctie in het validatiescherm.

## Structuur

```
investment-dashboard/
├── prisma/schema.prisma      # Snapshot, SnapshotPosition, Transaction, Prediction, Source, NewsItem, ExternalCache, Setting
├── prisma/seed.js            # Demodata: 4 snapshots, transacties, voorspellingen, nieuws, instellingen
├── src/lib/                  # pdf-parser, allocations, predictions, health, market-data, recommendations, config, format
├── src/app/api/              # import/pdf, snapshots, portfolio, positions, predictions, news, recommendations, evolutie, settings
├── src/app/                  # Pagina's (App Router) + components/ui
└── tests/                    # Unit tests: pdf-parser, predictions (scorecard), allocations
```

## Roadmap (volgende iteraties)

1. Echte Finnhub/Alpha Vantage-integratie verfijnen (consensus, EPS-revisies, dividends).
2. LLM-samenvattingen van nieuws en thesis-generatie via `MISTRAL_API_KEY`.
3. Automatische voorspellingen vanuit Bull/Base/Bear-scenario's ("AI-inschatting"-pipeline).
4. Benchmark-koershistoriek uit provider i.p.v. voorbeeldreeks in DEMO-modus.
