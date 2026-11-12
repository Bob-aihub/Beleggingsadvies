const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const positions = [
  { name: "iShares Core MSCI World UCITS ETF", ticker: "SWDA.AS", isin: "IE00B4L5Y983", exchange: "XAMS", assetClass: "ETF", sector: "Wereldwijd gemengd", region: "Wereldwijd", quantity: 120, purchasePrice: 78.4, currentPrice: 96.15, currency: "EUR", marketValue: 11538, returnPct: 22.6, dividend: 0, isEtf: true },
  { name: "Vanguard FTSE All-World UCITS ETF", ticker: "VWRL.AS", isin: "IE00BK5BQT80", exchange: "XAMS", assetClass: "ETF", sector: "Wereldwijd gemengd", region: "Wereldwijd", quantity: 40, purchasePrice: 102.1, currentPrice: 118.9, currency: "EUR", marketValue: 4756, returnPct: 16.5, dividend: 0, isEtf: true },
  { name: "ASML Holding", ticker: "ASML.AS", isin: "NL0010273215", exchange: "XAMS", assetClass: "Aandeel", sector: "Technologie", region: "Europa", quantity: 8, purchasePrice: 610, currentPrice: 705.4, currency: "EUR", marketValue: 5643.2, returnPct: 15.6, dividend: 6.1, isEtf: false },
  { name: "Apple Inc.", ticker: "AAPL", isin: "US0378331005", exchange: "NASDAQ", assetClass: "Aandeel", sector: "Technologie", region: "VS", quantity: 25, purchasePrice: 172.5, currentPrice: 228.6, currency: "USD", marketValue: 5715, returnPct: 32.5, dividend: 1.0, isEtf: false },
  { name: "KBC Groep", ticker: "KBC.BR", isin: "BE0003565737", exchange: "XBRU", assetClass: "Aandeel", sector: "Financiële diensten", region: "België", quantity: 60, purchasePrice: 68.2, currentPrice: 79.35, currency: "EUR", marketValue: 4761, returnPct: 16.3, dividend: 4.55, isEtf: false },
  { name: "Colruyt", ticker: "COLR.BR", isin: "BE0003565828", exchange: "XBRU", assetClass: "Aandeel", sector: "Retail", region: "België", quantity: 45, purchasePrice: 52.9, currentPrice: 49.1, currency: "EUR", marketValue: 2209.5, returnPct: -7.2, dividend: 1.2, isEtf: false },
];

function totalValue() {
  return positions.reduce((a, p) => a + p.marketValue, 0);
}

async function snapshotAt(dateIso, priceFactor, cash) {
  const date = new Date(dateIso);
  const adjusted = positions.map((p) => ({
    ...p,
    currentPrice: +(p.currentPrice * priceFactor).toFixed(2),
    marketValue: +(p.marketValue * priceFactor).toFixed(2),
  }));
  return prisma.snapshot.create({
    data: {
      date,
      source: "demo-seed",
      exportDate: date,
      totalValue: totalValue() * priceFactor,
      cash,
      positions: { create: adjusted },
    },
  });
}

async function main() {
  await prisma.snapshotPosition.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.source.deleteMany();
  await prisma.newsItem.deleteMany();
  await prisma.setting.deleteMany();

  await snapshotAt("2025-02-01", 0.86, 1800);
  await snapshotAt("2025-05-01", 0.92, 2100);
  await snapshotAt("2025-08-01", 0.95, 2280);
  await snapshotAt("2025-11-01", 1.0, 2450.35);

  await prisma.transaction.createMany({
    data: [
      { date: new Date("2025-03-10"), type: "KOPEN", ticker: "SWDA.AS", name: "iShares Core MSCI World UCITS ETF", quantity: 20, price: 88.1, currency: "EUR", fees: 3, note: "Maandelijkse inleg" },
      { date: new Date("2025-06-05"), type: "DIVIDEND", ticker: "KBC.BR", name: "KBC Groep", quantity: 60, price: 4.55, currency: "EUR", note: "Bruto dividend, voorheffing 30%" },
      { date: new Date("2025-09-15"), type: "KOPEN", ticker: "VWRL.AS", name: "Vanguard FTSE All-World UCITS ETF", quantity: 10, price: 116.4, currency: "EUR", fees: 3, note: "Bijkoop" },
    ],
  });

  const predictions = [
    { ticker: "ASML.AS", name: "ASML Holding", date: new Date("2025-08-01"), expectedPrice: 760, expectedPriceLow: 700, expectedPriceHigh: 820, horizon: "KORT", rationale: "Herstel van bookings na zwak kwartaal; EUV-vraag blijft overeind.", assumptions: "Capex-plannen chipmakers ongewijzigd; geen nieuwe exportrestricties.", origin: "MANUAL" },
    { ticker: "AAPL", name: "Apple Inc.", date: new Date("2025-06-01"), expectedPrice: 240, expectedPriceLow: 220, expectedPriceHigh: 260, horizon: "MIDDELLANG", rationale: "Dienstengroei en buybacks ondersteunen koers.", assumptions: "Marge blijft stabiel; geen grote productverstoring.", origin: "AI" },
    { ticker: "COLR.BR", name: "Colruyt", date: new Date("2025-08-01"), expectedPrice: 54, expectedPriceLow: 50, expectedPriceHigh: 58, horizon: "KORT", rationale: "Margedruk blijft; herstel pas bij lagere energiekosten.", assumptions: "Concurrentiedruk blijft gelijk.", origin: "MANUAL" },
    { ticker: "KBC.BR", name: "KBC Groep", date: new Date("2025-05-01"), expectedPrice: 78, expectedPriceLow: 72, expectedPriceHigh: 84, horizon: "MIDDELLANG", rationale: "Netto rentemarge blijft hoog; dividend aantrekkelijk.", assumptions: "ECB verlaagt geleidelijk; kredietkosten stabiel.", origin: "MANUAL" },
  ];

  for (const p of predictions) {
    await prisma.prediction.create({
      data: {
        ...p,
        sources: {
          create: [
            { organization: "Bedrijfsrapportage", title: "Laatste kwartaalcijfers", date: new Date("2025-07-15"), type: "primaire bron", url: "https://www.example.com/kwartaalcijfers" },
            { organization: "Marktdataprovider", title: "Consensus en koersdoelen", date: new Date("2025-07-20"), type: "databank", url: "https://finnhub.io/docs/api" },
          ],
        },
      },
    });
  }

  const demoNews = [
    { ticker: "ASML.AS", title: "ASML meldt sterkere boekingen dan verwacht in kwartaalcijfers", summary: "Boekingen boven consensus; langetermijnoutlook herhaald.", source: "Demo nieuwslijst", url: "https://www.asml.com/en/investors", publishedAt: new Date("2025-10-15T07:30:00Z"), sentiment: "positief" },
    { ticker: "ASML.AS", title: "Analisten temperen verwachtingen chipsector op korte termijn", summary: "Vertraagde orders bij eindklanten; herstel mogelijk in 2026.", source: "Demo nieuwslijst", url: "https://www.semi.org/en/products-services/market-data", publishedAt: new Date("2025-10-18T09:00:00Z"), sentiment: "neutraal" },
    { ticker: "AAPL", title: "Apple presenteert nieuwe productlijn; dienstenomzet groeit verder", summary: "Diensten ondersteunen marge; hardwaregroei wisselend per regio.", source: "Demo nieuwslijst", url: "https://investor.apple.com", publishedAt: new Date("2025-10-20T14:00:00Z"), sentiment: "positief" },
    { ticker: "KBC.BR", title: "KBC publiceert kwartaalcijfers met stabiele kernkapitaalratio", summary: "CET1 boven wettelijke buffer; dividendbeleid herbevestigd.", source: "Demo nieuwslijst", url: "https://www.kbc.com/en/investor-relations.html", publishedAt: new Date("2025-11-04T08:00:00Z"), sentiment: "neutraal" },
    { ticker: null, title: "ECB houdt beleidsrente onveranderd; inflatieprojectie licht bijgesteld", summary: "Rentepad blijft data-gedreven.", source: "ECB", url: "https://www.ecb.europa.eu/press/pr/html/index.en.html", publishedAt: new Date("2025-10-30T12:15:00Z"), sentiment: "neutraal" },
  ];
  await prisma.newsItem.createMany({ data: demoNews });

  await prisma.setting.createMany({
    data: [
      { key: "benchmark", value: "SWDA.AS" },
      { key: "benchmarkLabel", value: "MSCI World (via SWDA.AS)" },
      { key: "refreshIntervalMin", value: "5" },
    ],
  });

  console.log("Seed voltooid: 4 snapshots, 3 transacties, 4 voorspellingen, 5 nieuwsitems, instellingen.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
