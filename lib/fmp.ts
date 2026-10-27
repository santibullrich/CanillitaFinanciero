import 'server-only';

/**
 * Todas las llamadas a Financial Modeling Prep (API "stable") viven acá.
 * Si FMP cambia un nombre de campo o un endpoint, se corrige en este archivo.
 * Probá todo con: npm run check:fmp
 */
const BASE = 'https://financialmodelingprep.com/stable';

export class FmpError extends Error {
  constructor(public path: string, public status: number, msg?: string) {
    super(msg ?? `FMP ${path} respondió ${status}`);
  }
}

async function fmp<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}, revalidate = 60): Promise<T> {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new FmpError(path, 0, 'Falta la variable FMP_API_KEY');
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  url.searchParams.set('apikey', key);
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) throw new FmpError(path, res.status);
  const data = await res.json();
  if (data && !Array.isArray(data) && typeof data === 'object' && (data['Error Message'] || data.error)) {
    throw new FmpError(path, 402, String(data['Error Message'] || data.error));
  }
  return data as T;
}

const num = (v: any): number | null => (v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v));

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  previousClose: number | null;
  open: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  volume: number | null;
  marketCap: number | null;
  avg50: number | null;
  avg200: number | null;
  exchange: string;
};

export function normQuote(q: any): Quote {
  const price = num(q.price) ?? 0;
  const prev = num(q.previousClose);
  let pct = num(q.changePercentage) ?? num(q.changesPercentage);
  if (pct === null && prev) pct = (price / prev - 1) * 100;
  return {
    symbol: String(q.symbol),
    name: String(q.name ?? q.companyName ?? q.symbol),
    price,
    change: num(q.change) ?? 0,
    changePct: pct ?? 0,
    previousClose: prev,
    open: num(q.open),
    dayLow: num(q.dayLow),
    dayHigh: num(q.dayHigh),
    yearLow: num(q.yearLow),
    yearHigh: num(q.yearHigh),
    volume: num(q.volume),
    marketCap: num(q.marketCap),
    avg50: num(q.priceAvg50),
    avg200: num(q.priceAvg200),
    exchange: String(q.exchange ?? q.exchangeShortName ?? '')
  };
}

/** Cotizaciones de muchos símbolos (se piden de a 100). */
export async function getQuotes(symbols: string[], revalidate = 30): Promise<Quote[]> {
  const uniq = Array.from(new Set(symbols.filter(Boolean)));
  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += 100) chunks.push(uniq.slice(i, i + 100));
  const res = await Promise.all(chunks.map((c) => fmp<any[]>('/batch-quote', { symbols: c.join(',') }, revalidate).catch(() => [])));
  return res.flat().map(normQuote);
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const r = await fmp<any[]>('/quote', { symbol }, 30).catch(() => []);
  return r[0] ? normQuote(r[0]) : null;
}

/** Todas las acciones de una bolsa (por ejemplo NASDAQ, JPX, BUE). Respuesta grande: se cachea 2 minutos. */
export async function getExchangeQuotes(exchange: string): Promise<Quote[]> {
  const r = await fmp<any[]>('/batch-exchange-quote', { exchange, short: false }, 120).catch(() => []);
  return r.map(normQuote);
}

export async function getCryptoQuotes(): Promise<Quote[]> {
  const r = await fmp<any[]>('/batch-crypto-quotes', { short: false }, 60).catch(() => []);
  return r.map(normQuote);
}

export type SearchHit = { symbol: string; name: string; exchange: string; currency: string };

/** Busca en todas las bolsas del mundo por ticker y por nombre. */
export async function search(query: string): Promise<SearchHit[]> {
  const [a, b] = await Promise.all([
    fmp<any[]>('/search-symbol', { query, limit: 10 }, 3600).catch(() => []),
    fmp<any[]>('/search-name', { query, limit: 10 }, 3600).catch(() => [])
  ]);
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of [...a, ...b]) {
    if (!h?.symbol || seen.has(h.symbol)) continue;
    seen.add(h.symbol);
    out.push({ symbol: h.symbol, name: h.name ?? h.symbol, exchange: h.exchange ?? h.exchangeShortName ?? '', currency: h.currency ?? 'USD' });
  }
  return out.slice(0, 12);
}

export type Profile = { symbol: string; name: string; description: string; sector: string; industry: string; country: string; currency: string; website: string; exchange: string; marketCap: number | null; beta: number | null };

export async function getProfile(symbol: string): Promise<Profile | null> {
  const r = await fmp<any[]>('/profile', { symbol }, 86400).catch(() => []);
  const p = r[0];
  if (!p) return null;
  return {
    symbol: p.symbol, name: p.companyName ?? p.symbol, description: p.description ?? '', sector: p.sector ?? '', industry: p.industry ?? '',
    country: p.country ?? '', currency: p.currency ?? 'USD', website: p.website ?? '', exchange: p.exchange ?? p.exchangeShortName ?? '', marketCap: num(p.marketCap ?? p.mktCap), beta: num(p.beta)
  };
}

export type PriceTarget = { high: number | null; low: number | null; consensus: number | null; median: number | null };
export async function getPriceTarget(symbol: string): Promise<PriceTarget | null> {
  const r = await fmp<any[]>('/price-target-consensus', { symbol }, 43200).catch(() => []);
  const t = r[0];
  return t ? { high: num(t.targetHigh), low: num(t.targetLow), consensus: num(t.targetConsensus), median: num(t.targetMedian) } : null;
}

export type Grades = { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; consensus: string };
export async function getGrades(symbol: string): Promise<Grades | null> {
  const r = await fmp<any[]>('/grades-consensus', { symbol }, 43200).catch(() => []);
  const g = r[0];
  return g ? { strongBuy: num(g.strongBuy) ?? 0, buy: num(g.buy) ?? 0, hold: num(g.hold) ?? 0, sell: num(g.sell) ?? 0, strongSell: num(g.strongSell) ?? 0, consensus: String(g.consensus ?? '') } : null;
}

export type Ratios = { pe: number | null; dividendYield: number | null };
export async function getRatios(symbol: string): Promise<Ratios | null> {
  const r = await fmp<any[]>('/ratios-ttm', { symbol }, 43200).catch(() => []);
  const x = r[0];
  if (!x) return null;
  const dy = num(x.dividendYieldTTM ?? x.dividendYielTTM);
  return { pe: num(x.priceToEarningsRatioTTM ?? x.peRatioTTM), dividendYield: dy === null ? null : dy * 100 };
}

export type NewsItem = { title: string; site: string; url: string; date: string };
export async function getNews(symbol: string, limit = 8): Promise<NewsItem[]> {
  const path = /USD$/.test(symbol) ? '/news/crypto' : '/news/stock';
  const r = await fmp<any[]>(path, { symbols: symbol, limit }, 900).catch(() => []);
  return r.map((n) => ({ title: n.title ?? '', site: n.site ?? n.publisher ?? '', url: n.url ?? '', date: n.publishedDate ?? '' })).filter((n) => n.title);
}

export type Point = { t: string; p: number };

/** Precios de cierre diarios desde una fecha (YYYY-MM-DD). */
export async function getDaily(symbol: string, from: string): Promise<Point[]> {
  const r = await fmp<any[]>('/historical-price-eod/light', { symbol, from }, 21600).catch(() => []);
  return r.map((d) => ({ t: d.date, p: Number(d.price ?? d.close) })).filter((d) => isFinite(d.p)).reverse();
}

/** Velas intradiarias (5min o 1hour). */
export async function getIntraday(symbol: string, interval: '5min' | '1hour', from?: string): Promise<Point[]> {
  const r = await fmp<any[]>(`/historical-chart/${interval}`, { symbol, from }, interval === '5min' ? 120 : 1800).catch(() => []);
  return r.map((d) => ({ t: d.date, p: Number(d.close) })).filter((d) => isFinite(d.p)).reverse();
}

/** Tipos de cambio a dólar. Devuelve cuántos USD vale 1 unidad de cada moneda. */
export async function getFx(): Promise<Record<string, number>> {
  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDHKD', 'USDBRL', 'USDARS', 'USDCHF', 'USDCNY', 'USDCAD', 'USDMXN', 'AUDUSD', 'USDKRW', 'USDINR'];
  const qs = await getQuotes(pairs, 300);
  const fx: Record<string, number> = { USD: 1 };
  for (const q of qs) {
    if (!q.price) continue;
    const s = q.symbol;
    if (s.endsWith('USD') && s.length === 6) fx[s.slice(0, 3)] = q.price;
    else if (s.startsWith('USD') && s.length === 6) fx[s.slice(3)] = 1 / q.price;
  }
  if (fx.GBP) fx.GBp = fx.GBP / 100; // la bolsa de Londres cotiza en peniques
  return fx;
}
