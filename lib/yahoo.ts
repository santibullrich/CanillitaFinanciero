import 'server-only';
import yahooFinance from 'yahoo-finance2';
import { unstable_cache } from 'next/cache';

/**
 * Todos los datos de mercado vienen de Yahoo Finance a través de yahoo-finance2
 * (la misma fuente que usa yfinance). Es gratis y no necesita clave, pero no es
 * una API oficial: Yahoo puede limitar o cambiar las respuestas sin aviso.
 * Si algo deja de funcionar, se corrige en este archivo.
 */
try { (yahooFinance as any).suppressNotices?.(['yahooSurvey', 'ripHistorical']); } catch { /* versión sin avisos */ }

const NOVALIDATE = { validateResult: false } as any;
const yf: any = yahooFinance;

/** Último error visto por esta instancia (para la página de estado y los logs). */
export let lastError: { where: string; message: string; at: string } | null = null;
function logError(where: string, e: any) {
  lastError = { where, message: String(e?.message ?? e).slice(0, 300), at: new Date().toISOString() };
  console.error(`[Yahoo] ${where}: ${lastError.message}`);
}

/** Algunas versiones devuelven {raw, fmt}; esto siempre deja un número o null. */
const num = (v: any): number | null => {
  if (v && typeof v === 'object' && 'raw' in v) v = v.raw;
  return v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v);
};
const iso = (d: any): string => {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'number') return new Date(d < 1e12 ? d * 1000 : d).toISOString();
  return String(d ?? '');
};

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
  currency: string;
};

export function normQuote(q: any): Quote {
  const price = num(q.regularMarketPrice) ?? 0;
  const prev = num(q.regularMarketPreviousClose);
  let pct = num(q.regularMarketChangePercent);
  if (pct === null && prev) pct = (price / prev - 1) * 100;
  return {
    symbol: String(q.symbol),
    name: String(q.longName ?? q.shortName ?? q.symbol),
    price,
    change: num(q.regularMarketChange) ?? 0,
    changePct: pct ?? 0,
    previousClose: prev,
    open: num(q.regularMarketOpen),
    dayLow: num(q.regularMarketDayLow),
    dayHigh: num(q.regularMarketDayHigh),
    yearLow: num(q.fiftyTwoWeekLow),
    yearHigh: num(q.fiftyTwoWeekHigh),
    volume: num(q.regularMarketVolume),
    marketCap: num(q.marketCap),
    avg50: num(q.fiftyDayAverage),
    avg200: num(q.twoHundredDayAverage),
    exchange: q.quoteType === 'CRYPTOCURRENCY' ? 'CRYPTO' : String(q.exchange ?? ''),
    currency: String(q.currency ?? 'USD')
  };
}

/** Pide cotizaciones a Yahoo de a 100 símbolos. */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const out: Quote[] = [];
  for (let i = 0; i < symbols.length; i += 100) {
    const chunk = symbols.slice(i, i + 100);
    try {
      const r = await yf.quote(chunk, {}, NOVALIDATE);
      for (const q of Array.isArray(r) ? r : [r]) if (q?.symbol) out.push(normQuote(q));
    } catch (e) {
      logError(`quote (${chunk.length} símbolos)`, e);
    }
  }
  return out.filter((q) => q.price > 0);
}

const quotesFast = unstable_cache(async (key: string) => {
  const r = await fetchQuotes(key.split(','));
  if (!r.length) throw new Error('Yahoo no devolvió cotizaciones');
  return r;
}, ['yq-fast-v1'], { revalidate: 30 });

const quotesSlow = unstable_cache(async (key: string) => {
  const r = await fetchQuotes(key.split(','));
  if (!r.length) throw new Error('Yahoo no devolvió cotizaciones');
  return r;
}, ['yq-slow-v1'], { revalidate: 300 });

/** Cotizaciones de muchos símbolos. revalidate ≤ 60 usa la caché corta (30 s); si no, la de 5 minutos. */
export async function getQuotes(symbols: string[], revalidate = 30): Promise<Quote[]> {
  const uniq = Array.from(new Set(symbols.filter(Boolean))).sort();
  if (!uniq.length) return [];
  try {
    return await (revalidate <= 60 ? quotesFast : quotesSlow)(uniq.join(','));
  } catch {
    return [];
  }
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  return (await getQuotes([symbol], 30))[0] ?? null;
}

/** Las que más suben o bajan hoy en Estados Unidos (listas predefinidas de Yahoo). */
export const getDayMovers = unstable_cache(async (kind: 'day_gainers' | 'day_losers'): Promise<Quote[]> => {
  const r = await yf.screener({ scrIds: kind, count: 25 }, NOVALIDATE);
  const out = (r?.quotes ?? []).map(normQuote).filter((q: Quote) => q.price > 0);
  if (!out.length) throw new Error('Screener vacío');
  return out;
}, ['ymovers-v1'], { revalidate: 300 });

export type SearchHit = { symbol: string; name: string; exchange: string; currency: string };

const searchCached = unstable_cache(async (query: string): Promise<SearchHit[]> => {
  const r = await yf.search(query, { quotesCount: 12, newsCount: 0 }, NOVALIDATE);
  return (r?.quotes ?? [])
    .filter((q: any) => q?.symbol && ['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'INDEX'].includes(q.quoteType))
    .map((q: any) => ({ symbol: q.symbol, name: q.longname ?? q.shortname ?? q.symbol, exchange: q.quoteType === 'CRYPTOCURRENCY' ? 'CRYPTO' : q.exchDisp ?? q.exchange ?? '', currency: '' }));
}, ['ysearch-v1'], { revalidate: 3600 });

/** Busca en todas las bolsas del mundo por ticker y por nombre. */
export async function search(query: string): Promise<SearchHit[]> {
  try { return (await searchCached(query.trim().toLowerCase())).slice(0, 12); } catch (e) { logError('search', e); return []; }
}

/** Ficha de la empresa: perfil, ratios, analistas. Se guarda 12 horas. */
const summaryCached = unstable_cache(async (symbol: string): Promise<any> => {
  try {
    return await yf.quoteSummary(symbol, { modules: ['price', 'assetProfile', 'summaryDetail', 'financialData', 'recommendationTrend', 'defaultKeyStatistics'] }, NOVALIDATE);
  } catch {
    // Cripto e índices no tienen perfil ni analistas: se piden solo los módulos básicos.
    return await yf.quoteSummary(symbol, { modules: ['price', 'summaryDetail'] }, NOVALIDATE);
  }
}, ['ysummary-v1'], { revalidate: 43200 });

async function getSummary(symbol: string): Promise<any | null> {
  try { return await summaryCached(symbol); } catch (e) { logError(`quoteSummary ${symbol}`, e); return null; }
}

export type Profile = { symbol: string; name: string; description: string; sector: string; industry: string; country: string; currency: string; website: string; exchange: string; marketCap: number | null; beta: number | null };

export async function getProfile(symbol: string): Promise<Profile | null> {
  const s = await getSummary(symbol);
  if (!s) return null;
  const p = s.price ?? {}, a = s.assetProfile ?? {}, d = s.summaryDetail ?? {}, k = s.defaultKeyStatistics ?? {};
  return {
    symbol, name: p.longName ?? p.shortName ?? symbol, description: a.longBusinessSummary ?? '', sector: a.sector ?? '', industry: a.industry ?? '',
    country: a.country ?? '', currency: p.currency ?? d.currency ?? 'USD', website: a.website ?? '', exchange: p.exchange ?? '',
    marketCap: num(p.marketCap ?? d.marketCap), beta: num(d.beta ?? k.beta)
  };
}

export type PriceTarget = { high: number | null; low: number | null; consensus: number | null; median: number | null };
export async function getPriceTarget(symbol: string): Promise<PriceTarget | null> {
  const f = (await getSummary(symbol))?.financialData;
  if (!f || num(f.targetMeanPrice) === null) return null;
  return { high: num(f.targetHighPrice), low: num(f.targetLowPrice), consensus: num(f.targetMeanPrice), median: num(f.targetMedianPrice) };
}

export type Grades = { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; consensus: string };
export async function getGrades(symbol: string): Promise<Grades | null> {
  const s = await getSummary(symbol);
  const trend = s?.recommendationTrend?.trend ?? [];
  const t = trend.find((x: any) => x.period === '0m') ?? trend[0];
  if (!t) return null;
  const g = { strongBuy: num(t.strongBuy) ?? 0, buy: num(t.buy) ?? 0, hold: num(t.hold) ?? 0, sell: num(t.sell) ?? 0, strongSell: num(t.strongSell) ?? 0 };
  if (!g.strongBuy && !g.buy && !g.hold && !g.sell && !g.strongSell) return null;
  return { ...g, consensus: String(s?.financialData?.recommendationKey ?? '') };
}

export type Ratios = { pe: number | null; dividendYield: number | null };
export async function getRatios(symbol: string): Promise<Ratios | null> {
  const d = (await getSummary(symbol))?.summaryDetail;
  if (!d) return null;
  const dy = num(d.dividendYield ?? d.trailingAnnualDividendYield);
  return { pe: num(d.trailingPE), dividendYield: dy === null ? null : dy * 100 };
}

export type NewsItem = { title: string; site: string; url: string; date: string };
const newsCached = unstable_cache(async (symbol: string, limit: number): Promise<NewsItem[]> => {
  const r = await yf.search(symbol, { quotesCount: 0, newsCount: limit }, NOVALIDATE);
  return (r?.news ?? []).map((n: any) => ({ title: n.title ?? '', site: n.publisher ?? '', url: n.link ?? '', date: iso(n.providerPublishTime) })).filter((n: NewsItem) => n.title);
}, ['ynews-v1'], { revalidate: 900 });

export async function getNews(symbol: string, limit = 8): Promise<NewsItem[]> {
  try { return await newsCached(symbol, limit); } catch (e) { logError(`news ${symbol}`, e); return []; }
}

export type Point = { t: string; p: number };

async function chart(symbol: string, interval: '5m' | '60m' | '1d', from: string): Promise<Point[]> {
  const r = await yf.chart(symbol, { period1: from, interval }, NOVALIDATE);
  return (r?.quotes ?? []).map((q: any) => ({ t: iso(q.date), p: num(q.close) ?? NaN })).filter((q: Point) => isFinite(q.p));
}
const dailyCached = unstable_cache((symbol: string, from: string) => chart(symbol, '1d', from), ['ydaily-v1'], { revalidate: 21600 });
const intraFast = unstable_cache((symbol: string, from: string) => chart(symbol, '5m', from), ['yintra5-v1'], { revalidate: 120 });
const intraHour = unstable_cache((symbol: string, from: string) => chart(symbol, '60m', from), ['yintra60-v1'], { revalidate: 1800 });

/** Cierres diarios desde una fecha (YYYY-MM-DD), del más viejo al más nuevo. */
export async function getDaily(symbol: string, from: string): Promise<Point[]> {
  try { return await dailyCached(symbol, from); } catch (e) { logError(`chart 1d ${symbol}`, e); return []; }
}
/** Precios intradiarios cada 5 minutos o cada hora. */
export async function getIntraday(symbol: string, interval: '5min' | '1hour', from: string): Promise<Point[]> {
  try { return await (interval === '5min' ? intraFast : intraHour)(symbol, from); } catch (e) { logError(`chart ${interval} ${symbol}`, e); return []; }
}

/** Tipos de cambio: cuántos dólares vale 1 unidad de cada moneda. */
export async function getFx(): Promise<Record<string, number>> {
  const direct = ['EUR', 'GBP', 'AUD'];          // Yahoo cotiza EURUSD=X: dólares por euro
  const inverse = ['JPY', 'HKD', 'BRL', 'ARS', 'CHF', 'CNY', 'CAD', 'MXN', 'KRW', 'INR', 'TWD']; // JPY=X: yenes por dólar
  const qs = await getQuotes([...direct.map((c) => `${c}USD=X`), ...inverse.map((c) => `${c}=X`)], 300);
  const fx: Record<string, number> = { USD: 1 };
  for (const q of qs) {
    if (!q.price) continue;
    const m = q.symbol.match(/^([A-Z]{3})(USD)?=X$/);
    if (!m) continue;
    fx[m[1]] = m[2] ? q.price : 1 / q.price;
  }
  if (fx.GBP) fx.GBp = fx.GBP / 100; // Londres cotiza en peniques
  return fx;
}
