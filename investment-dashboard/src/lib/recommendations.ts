export type Action = "KOPEN" | "BIJKOPEN" | "HOUDEN" | "OPVOLGEN";
export type Confidence = "Hoog" | "Gemiddeld" | "Laag";
export type SourceType = "primaire bron" | "databank" | "analistenopinie" | "nieuws";

export interface RecSource {
  organization: string;
  title: string;
  date: string;
  type: SourceType;
  url: string;
}

export interface Statement {
  kind: "FEIT" | "ANALYSE" | "INSCHATTING";
  text: string;
  sourceIndex?: number;
}

export interface Recommendation {
  id: string;
  name: string;
  ticker: string;
  isin: string;
  type: "Aandeel" | "ETF";
  action: Action;
  horizon: "KORT" | "MIDDELLANG" | "LANG";
  horizonLabel: string;
  expectedGrowth: string;
  riskLevel: "laag" | "gemiddeld" | "hoog";
  valuation: string;
  portfolioFit: string;
  taxNote: string;
  confidence: Confidence;
  statements: Statement[];
  bull: string[];
  bear: string[];
  catalysts: string[];
  sources: RecSource[];
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-vwrl-dca",
    name: "Vanguard FTSE All-World UCITS ETF (Acc/Dist)",
    ticker: "VWRL.AS / VWCE.DE",
    isin: "IE00BK5BQT80 / IE00BK5BQT80",
    type: "ETF",
    action: "BIJKOPEN",
    horizon: "LANG",
    horizonLabel: "Lange termijn (3+ jaar)",
    expectedGrowth: "Historisch wereldindexrendement ~6-8% per jaar gemiddeld over lange periodes; geen garantie",
    riskLevel: "laag",
    valuation: "Marktgewogen index — waardering volgt de wereldmarkt (K/W wereldindex ~19-21 op moment van laatste data-update; verifieeractie via databank)",
    portfolioFit:
      "Kernpositie: lage kosten, brede spreiding, beperkt overlap-effect met bestaande wereld-ETF maar versterkt de kern; verlaagt individueel aandeelrisico.",
    taxNote:
      "TOB-aangifte: ETF's met Franse domicilie (FCC) vallen onder de Reynders-taks van 30% op interestinkomsten bij verkoop; Belgische domicilie (BEVEK) onder de beurstaks 1,32% bij verkoop. Dividend bij distribuerende ETF's: 30% roerende voorheffing (15% voor erkende Belgische ETF's). Raadpleeg altijd de actuele FOD Financiën-website; tarieven kunnen wijzigen.",
    confidence: "Hoog",
    statements: [
      { kind: "FEIT", text: "De ETF volgt de FTSE All-World index met een totale kostenratio van 0,22%.", sourceIndex: 0 },
      { kind: "FEIT", text: "De fund size en UCITS-status zijn verifieerbaar in het fondsfactsheet van Vanguard.", sourceIndex: 0 },
      { kind: "ANALYSE", text: "Brede wereldindexdekking verlaagt het specifieke bedrijfsrisico ten opzichte van losse aandelen.", sourceIndex: 1 },
      { kind: "INSCHATTING", text: "Op horizon 3+ jaar is een gemiddeld langetermijnrendement in lijn met de historische wereldindexrealisatie aannemelijk; dit berust op historie en aannames over toekomstige waarderingen, niet op een garantie.", sourceIndex: 1 },
    ],
    bull: [
      "Eén positie dekt developed én emerging markets",
      "Lage kostenratio drukt het rendement op lange termijn het minst",
      "Automatische herbalancering binnen de index",
    ],
    bear: [
      "Volledige marktparticipatie betekent ook volledige neerwaartse marktbeweging",
      "Geen bescherming tegen waarderingsdalingen van de wereldmarkt als geheel",
    ],
    catalysts: [
      "Periodieke herbalancering van de index",
      "Rentepad van ECB/Fed (beïnvloedt waardering van groeiaandelen in de index)",
    ],
    sources: [
      {
        organization: "Vanguard",
        title: "Vanguard FTSE All-World UCITS ETF — Factsheet",
        date: "2025-10-01",
        type: "primaire bron",
        url: "https://www.vanguard.nl/en-investor/etf/list/etf-all-world",
      },
      {
        organization: "FTSE Russell",
        title: "FTSE All-World Index Factsheet",
        date: "2025-10-31",
        type: "databank",
        url: "https://www.ftserussell.com/products/indices/global-equity",
      },
    ],
  },
  {
    id: "rec-asml",
    name: "ASML Holding",
    ticker: "ASML.AS",
    isin: "NL0010273215",
    type: "Aandeel",
    action: "BIJKOPEN",
    horizon: "MIDDELLANG",
    horizonLabel: "Middellange termijn (6 maanden - 3 jaar)",
    expectedGrowth: "Consensus-koersdoelen lopen uiteen; check actuele consensus via de marktdataprovider voor het meest recente cijfer",
    riskLevel: "gemiddeld",
    valuation: "K/W rond 30-35 op basis van laatste verifieerbare cijfers (zie positiedetail); historisch gemiddelde lager",
    portfolioFit:
      "Bestaande positie: bijkopen verhoogt de sectorconcentratie Technologie; afwegen tegen de wereld-ETF die ASML ook aanhoudt (overlap).",
    taxNote:
      "Losse aandelen: 30% roerende voorheffing op dividenden (vaak verminderd tot 15% via vrijstelling op grond van moedervennootschapsregeling — voor particuliere beleggers doorgaans 30%). Aankoop/verkoop via Belgische broker: beurstaks 0,35% per transactie (met plafond). TOB-aangifteplicht bij niet-Belgische financiële tussenpersoon.",
    confidence: "Gemiddeld",
    statements: [
      { kind: "FEIT", text: "ASML heeft een monopoliepositie in EUV-lithografiesystemen; dit is verifieerbaar in de jaarrekening en investeerderspresentaties.", sourceIndex: 0 },
      { kind: "FEIT", text: "De omzetbesturing komt uit de orderportefeuille (bookings), gepubliceerd in kwartaalcijfers.", sourceIndex: 0 },
      { kind: "ANALYSE", text: "Zolang halfgeleiderkapitaaluitgaven stijgen, blijft de vraag naar EUV-systemen overeind; dit volgt uit gepubliceerde capex-verwachtingen van chipmakers.", sourceIndex: 1 },
      { kind: "INSCHATTING", text: "Op 6-36 maanden wordt een herstel van bookings en daarmee koersherstel verwacht mits capex-plannen van de grote chipmakers niet worden teruggedraaid; dit is een prognose met expliciete aannames.", sourceIndex: 2 },
    ],
    bull: [
      "Vrijwel enige leverancier van EUV-machines",
      "Sterke orderportefeuille in recente kwartalen",
      "Hoge marges en sterke balans",
    ],
    bear: [
      "Cyclische sector; capex-inkrimping bij klanten drukt direct op bookings",
      "Exportbeperkingen naar China kunnen de verkoop beperken",
      "Waardering bovengemiddeld t.o.v. eigen historie",
    ],
    catalysts: [
      "Kwartaalcijfers met bookings- en outlook-update",
      "Investor Day met langetermijndoelstellingen",
      "Nieuwe High-NA EUV-orders",
    ],
    sources: [
      {
        organization: "ASML",
        title: "Quarterly results en Annual Report",
        date: "2025-10-15",
        type: "primaire bron",
        url: "https://www.asml.com/en/investors",
      },
      {
        organization: "SEMI",
        title: "Worldwide Semiconductor Equipment Market Forecast",
        date: "2025-09-01",
        type: "databank",
        url: "https://www.semi.org/en/products-services/market-data",
      },
      {
        organization: "Verschillende brokerage-analisten",
        title: "Analyst consensus overzicht (via marktdataprovider)",
        date: "2025-10-20",
        type: "analistenopinie",
        url: "https://finnhub.io/docs/api",
      },
    ],
  },
  {
    id: "rec-kbc",
    name: "KBC Groep",
    ticker: "KBC.BR",
    isin: "BE0003565737",
    type: "Aandeel",
    action: "HOUDEN",
    horizon: "KORT",
    horizonLabel: "Korte termijn (0-6 maanden)",
    expectedGrowth: "Beperkte koersverwachting op korte horizon; dividend is de belangrijkste driver",
    riskLevel: "laag",
    valuation: "K/W ~9 op basis van laatste verifieerbare cijfers (zie positiedetail)",
    portfolioFit:
      "Bestaande Belgische positie met dividend; verlaagt de volatiliteit van de technologie/geïmporteerde delen van de portefeuille.",
    taxNote:
      "Dividend van Belgische vennootschappen: 30% roerende voorheffing wordt door KBC ingehouden. Vrijstelling voor particulieren is beperkt (kleine aandelen vrijstelling is afgeschaft sinds 2018). Verkoop: beurstaks 0,35% bij Belgische broker.",
    confidence: "Hoog",
    statements: [
      { kind: "FEIT", text: "KBC publiceert kwartaalcijfers met kernkapitaalratio (CET1) boven de wettelijke vereisten.", sourceIndex: 0 },
      { kind: "FEIT", text: "Dividendbeleid en buyback-vermeldingen staan in de officiële persberichten.", sourceIndex: 0 },
      { kind: "ANALYSE", text: "Banken profiteren van hogere netto rentemarge zolang de korte rente verhoogd blijft.", sourceIndex: 1 },
      { kind: "INSCHATTING", text: "Op 0-6 maanden wordt een beperkte koersbeweging verwacht met dividend als voornaamste opbrengst; afhankelijk van renteverwachtingen ECB.", sourceIndex: 2 },
    ],
    bull: ["Sterke kapitaalbuffer", "Voorspelbaar dividend", "Lage waardering t.o.v. historie"],
    bear: ["Renteverlagingen drukken netto rentemarge", "Kredietverliezen bij economische vertraging"],
    catalysts: ["ECB-rentebesluiten", "Volgende kwartaalcijfers", "Dividendaankondiging"],
    sources: [
      {
        organization: "KBC Groep",
        title: "Financiële verslagen en persberichten",
        date: "2025-11-04",
        type: "primaire bron",
        url: "https://www.kbc.com/en/investor-relations.html",
      },
      {
        organization: "NBB",
        title: "Financiële stabiliteitsrapport",
        date: "2025-05-01",
        type: "databank",
        url: "https://www.nbb.be/nl/publicaties/financiele-stabiliteit",
      },
      {
        organization: "ECB",
        title: "Monetair beleid — persconferenties",
        date: "2025-10-30",
        type: "primaire bron",
        url: "https://www.ecb.europa.eu/press/pr/html/index.en.html",
      },
    ],
  },
  {
    id: "rec-colr-watch",
    name: "Colruyt",
    ticker: "COLR.BR",
    isin: "BE0003565828",
    type: "Aandeel",
    action: "OPVOLGEN",
    horizon: "KORT",
    horizonLabel: "Korte termijn (0-6 maanden)",
    expectedGrowth: "Geen koerswinst verwacht op korte horizon; positie staat onder water en wordt gemonitord",
    riskLevel: "laag",
    valuation: "K/W ~14-15 op basis van laatste verifieerbare cijfers",
    portfolioFit: "Bestaande Belgische retailpositie; diversifieert tegen technologie, maar momentum is zwak.",
    taxNote: "Dividend: 30% roerende voorheffing. Verkoop: beurstaks 0,35% bij Belgische broker; TOB-aangifte indien via buitenlandse broker.",
    confidence: "Gemiddeld",
    statements: [
      { kind: "FEIT", text: "Colruyt rapporteert kwartaalverkoopcijfers en resultaten via officiële persberichten.", sourceIndex: 0 },
      { kind: "ANALYSE", text: "Margeonder druk door concurrentie en energiekosten; zichtbaar in de laatste resultaten.", sourceIndex: 0 },
      { kind: "INSCHATTING", text: "Herstel verwacht pas zodra marges herstellen; op korte termijn geen positieve koersverwachting.", sourceIndex: 1 },
    ],
    bull: ["Sterke marktpositie in België", "Defensieve sector", "Dividendgeschiedenis"],
    bear: ["Margedruk", "Aanhoudende koerszwakte", "Concurrentie van discounters"],
    catalysts: ["Volgende resultaten", "Prijsstrategie-updates", "Energiekostenontwikkeling"],
    sources: [
      {
        organization: "Colruyt Group",
        title: "Resultaten en persberichten",
        date: "2025-10-01",
        type: "primaire bron",
        url: "https://www.colruytgroup.com/wps/portal/cg/nl/investor_relations",
      },
      {
        organization: "Statbel / NBB",
        title: "Consumentenprijzen en retailindicatoren",
        date: "2025-10-15",
        type: "databank",
        url: "https://www.nbb.be/nl/statistieken",
      },
    ],
  },
];

export const TAX_REFERENCE = {
  rule:
    "Belgische particuliere belegger: roerende voorheffing 30% op dividenden; beurstaks 0,12% (ETF Belgische domicilie: 1,32% bij verkoop) of 0,35% per transactie naargelang het instrument; TOB-aangifte bij buitenlandse broker; Reynders-taks 30% op interestinkomsten van frankrijk-domicilie ETF's bij verkoop.",
  why:
    "Deze regels gelden voor particuliere beleggers die wonen in België en niet via een Belgische financiële tussenpersoon handelen (dan wordt de taks automatisch ingehouden).",
  calculation:
    "Bijv. dividend €100: €30 roerende voorheffing → €70 netto. Beurstaks bij aankoop €10.000 aandelen: €35. Reynders-taks bij verkoop ETF met €50 interestinkomsten: €15.",
  source: "FOD Financiën — roerende voorheffing en beurstaks",
  sourceUrl: "https://finances.belgium.be/nl/ondernemingen/vennootschapsbelasting/roerende-voorheffing",
  date: "2025-10-01",
  uncertainty:
    "Tarieven en drempels wijzigen periodiek; verifieer altijd op de website van de FOD Financiën. De Reynders-taks en beurstakstarieven per instrumenttype kunnen per domicilie verschillen.",
};

export function getRecommendations(horizon?: string): Recommendation[] {
  if (!horizon || horizon === "ALLE") return RECOMMENDATIONS;
  return RECOMMENDATIONS.filter((r) => r.horizon === horizon);
}
