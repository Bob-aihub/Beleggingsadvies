import { prisma } from "./db";
import { getAppConfig } from "./config";
import { DEMO_PRICE_HISTORY } from "./demo-data";

const CACHE_TTL_MS = 5 * 60 * 1000;

class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxPerMinute = 50) {}
  async acquire(): Promise<boolean> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length >= this.maxPerMinute) return false;
    this.timestamps.push(now);
    return true;
  }
}

const limiter = new RateLimiter();

export interface Quote {
  ticker: string;
  price: number | null;
  currency: string;
  changePctDay: number | null;
  fetchedAt: string;
  source: string;
  demo: boolean;
  note?: string;
}

export interface PriceHistoryPoint {
  date: string;
  close: number;
}

async function readCache(key: string): Promise<{ payload: unknown; fetchedAt: Date } | null> {
  const hit = await prisma.externalCache.findUnique({ where: { key } });
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { payload: JSON.parse(hit.payload), fetchedAt: hit.fetchedAt };
  }
  return null;
}

async function writeCache(key: string, payload: unknown): Promise<void> {
  await prisma.externalCache.upsert({
    where: { key },
    create: { key, payload: JSON.stringify(payload), fetchedAt: new Date() },
    update: { payload: JSON.stringify(payload), fetchedAt: new Date() },
  });
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

async function finnhubQuote(ticker: string): Promise<Quote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const allowed = await limiter.acquire();
  if (!allowed) return null;
  const res = await fetchWithRetry(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${key}`);
  if (!res) return null;
  const data = (await res.json()) as { c?: number; dp?: number };
  if (!data || typeof data.c !== "number" || data.c === 0) return null;
  return {
    ticker,
    price: data.c,
    currency: "USD",
    changePctDay: data.dp ?? null,
    fetchedAt: new Date().toISOString(),
    source: "Finnhub",
    demo: false,
  };
}

export async function getQuote(ticker: string): Promise<Quote> {
  const cacheKey = `quote:${ticker}`;
  const cached = await readCache(cacheKey);
  if (cached) {
    const q = cached.payload as Quote;
    return { ...q, fetchedAt: cached.fetchedAt.toISOString() };
  }

  const config = getAppConfig();
  let quote: Quote | null = null;
  if (config.marketProvider === "finnhub") {
    quote = await finnhubQuote(ticker);
  }

  if (!quote) {
    const history = DEMO_PRICE_HISTORY[ticker];
    const last = history?.[history.length - 1];
    const prev = history?.[history.length - 2];
    quote = {
      ticker,
      price: last?.close ?? null,
      currency: "EUR",
      changePctDay: last && prev ? ((last.close - prev.close) / prev.close) * 100 : null,
      fetchedAt: new Date().toISOString(),
      source: "Voorbeelddata",
      demo: true,
      note: "Geen API-sleutel geconfigureerd: toont voorbeelddata.",
    };
  } else {
    await writeCache(cacheKey, quote);
  }
  return quote;
}

export async function getPriceHistory(ticker: string): Promise<{ points: PriceHistoryPoint[]; demo: boolean; source: string }> {
  const cacheKey = `history:${ticker}`;
  const cached = await readCache(cacheKey);
  if (cached) {
    const p = cached.payload as { points: PriceHistoryPoint[]; demo: boolean; source: string };
    return p;
  }

  const config = getAppConfig();
  if (config.marketProvider === "finnhub") {
    const key = process.env.FINNHUB_API_KEY;
    const to = new Date();
    const from = new Date(to.getTime() - 370 * 24 * 3600 * 1000);
    const allowed = await limiter.acquire();
    if (key && allowed) {
      const res = await fetchWithRetry(
        `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${Math.floor(from.getTime() / 1000)}&to=${Math.floor(to.getTime() / 1000)}&token=${key}`
      );
      if (res) {
        const data = (await res.json()) as { s?: string; t?: number[]; c?: number[] };
        if (data.s === "ok" && data.t && data.c) {
          const points = data.t.map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: data.c![i] }));
          const result = { points, demo: false, source: "Finnhub" };
          await writeCache(cacheKey, result);
          return result;
        }
      }
    }
  }

  return { points: DEMO_PRICE_HISTORY[ticker] ?? [], demo: true, source: "Voorbeelddata" };
}

export async function fetchAndStoreNews(tickers: string[]): Promise<{ demo: boolean; count: number }> {
  const config = getAppConfig();
  if (!config.newsProvider || config.newsProvider === "demo") {
    return { demo: true, count: 0 };
  }
  const key = process.env.FINNHUB_NEWS_API_KEY || process.env.FINNHUB_API_KEY;
  if (!key) return { demo: true, count: 0 };

  let count = 0;
  for (const ticker of tickers.slice(0, 10)) {
    const allowed = await limiter.acquire();
    if (!allowed) break;
    const res = await fetchWithRetry(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}&token=${key}`
    );
    if (!res) continue;
    const items = (await res.json()) as Array<{ headline?: string; summary?: string; source?: string; url?: string; datetime?: number }>;
    for (const item of items.slice(0, 10)) {
      if (!item.headline || !item.url) continue;
      const exists = await prisma.newsItem.findFirst({
        where: { ticker, url: item.url },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.newsItem
        .create({
          data: {
            ticker,
            title: item.headline,
            summary: item.summary ?? null,
            source: item.source ?? "Finnhub",
            url: item.url,
            publishedAt: item.datetime ? new Date(item.datetime * 1000) : new Date(),
            sentiment: null,
          },
        })
        .catch(() => null);
      count++;
    }
  }
  return { demo: false, count };
}
