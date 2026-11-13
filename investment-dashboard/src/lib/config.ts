export interface AppConfig {
  demoMode: boolean;
  marketProvider: "finnhub" | "alphavantage" | "demo";
  newsProvider: "finnhub" | "demo";
  llmEnabled: boolean;
  missingKeys: string[];
}

export function getAppConfig(): AppConfig {
  const finnhub = !!process.env.FINNHUB_API_KEY;
  const alphavantage = !!process.env.ALPHAVANTAGE_API_KEY;
  const newsKey = !!(process.env.FINNHUB_NEWS_API_KEY || process.env.FINNHUB_API_KEY);
  const llm = !!process.env.MISTRAL_API_KEY;

  const missingKeys: string[] = [];
  if (!finnhub && !alphavantage) missingKeys.push("FINNHUB_API_KEY of ALPHAVANTAGE_API_KEY");
  if (!newsKey) missingKeys.push("FINNHUB_NEWS_API_KEY");
  if (!llm) missingKeys.push("MISTRAL_API_KEY (optioneel)");

  return {
    demoMode: !finnhub && !alphavantage,
    marketProvider: finnhub ? "finnhub" : alphavantage ? "alphavantage" : "demo",
    newsProvider: newsKey ? "finnhub" : "demo",
    llmEnabled: llm,
    missingKeys,
  };
}
