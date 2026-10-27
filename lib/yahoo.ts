import 'server-only';
import yahooFinance from 'yahoo-finance2';
import { unstable_cache } from 'next/cache';

/**
 * Datos de mercado gratis, sin clave.
 *
 * Yahoo Finance bloquea ("Too Many Requests") el permiso de sesión que piden
 * algunas consultas cuando vienen de servidores en la nube como Vercel. Por eso:
 * - Precios, gráficos, buscador, noticias y listas del día se piden directo a
 *   las direcciones públicas de Yahoo que no necesitan ese permiso.
 * - La cripto viene de CoinGecko (gratis, sin clave).
 * - La ficha de la empresa (rubro, analistas, P/E) usa yahoo-finance2, que sí
 *   necesita el permiso: si Yahoo lo niega, esas secciones se ocultan solas.
 * Si algo deja de funcionar, se corrige en este archivo.
 */
try { (yahooFinance as any).suppressNotices?.(['yahooSurvey', 'ripHistorical']); } catch { /* sin avisos */ }
const yf: any = yahooFinance;
const NOVALIDATE = { validateResult: false } as any;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

/** Último error visto por esta instancia (para la página de estado y los logs). */
export let lastError: { where: string; message: string; at: string } | null = null;
function logError(where: string, e: any) {
  lastError = { where, message: String(e?.message ?? e).slice(0, 300), at: new Date().toISOString() };
  console.error(`[Datos] ${where}: ${lastError.message}`);
}

const num = (v: any): number | null => {
  if (v && typeof v === 'object' && 'raw' in v) v = v.raw;
  return v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v);
};
const iso = (d: any): string => {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'number') return new Date(d < 1e12 ? d * 1000 : d).toISOString();
  return String(d ?? '');
};

/** GET a Yahoo con encabezados de navegador, probando los dos servidores públicos. */
export async function yjson(path: string): Promise<any> {
  let last: any;
  for (const host of HOSTS) {
    try {
      const r = await fetch(host + path, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'en-US,en;q=0.9' }, cache: 'no-store' });
      const t = await r.text();
      if (!r.ok) { last = new Error(`${r.status} ${t.slice(0, 120)}`); continue; }
      return JSON.parse(t);
    } catch (e) { last = e; }
  }
  throw last;
}

export type Quote = {
  symbol: string; name: string; price: number; change: number; changePct: number; previousClose: number | null;
  open: number | null; dayLow: number | null; dayHigh: number | null; yearLow: number | null; yearHigh: number | null;
  volume: number | null; marketCap: number | null; avg50: number | null; avg200: number | null; exchange: string; currency: string;
};

/** Cotización completa (la que devuelven las listas del día y yahoo-finance2). */
export function normQuote(q: any): Quote {
  const price = num(q.regularMarketPrice) ?? 0;
  const prev = num(q.regularMarketPreviousClose);
  let pct = num(q.regularMarketChangePercent);
  if (pct === null && prev) pct = (price / prev - 1) * 100;
  return {
    symbol: String(q.symbol), name: String(q.longName ?? q.shortName ?? q.symbol), price, change: num(q.regularMarketChange) ?? 0, changePct: pct ?? 0,
    previousClose: prev, open: num(q.regularMarketOpen), dayLow: num(q.regularMarketDayLow), dayHigh: num(q.regularMarketDayHigh),
    yearLow: num(q.fiftyTwoWeekLow), yearHigh: num(q.fiftyTwoWeekHigh), volume: num(q.regularMarketVolume), marketCap: num(q.marketCap),
    avg50: num(q.fiftyDayAverage), avg200: num(q.twoHundredDayAverage),
    exchange: q.quoteType === 'CRYPTOCURRENCY' ? 'CRYPTO' : String(q.exchange ?? ''), currency: String(q.currency ?? 'USD')
  };
}

/** Cotización a partir del bloque "meta" de los gráficos de Yahoo (no trae valor de mercado). */
function metaQuote(meta: any, symbol?: string): Quote | null {
  const price = num(meta?.regularMarketPrice);
  if (!price) return null;
  const prev = num(meta.previousClose) ?? num(meta.chartPreviousClose);
  return {
    symbol: String(meta.symbol ?? symbol), name: String(meta.longName ?? meta.shortName ?? meta.symbol ?? symbol), price,
    change: prev ? price - prev : 0, changePct: prev ? (price / prev - 1) * 100 : 0, previousClose: prev, open: null,
    dayLow: num(meta.regularMarketDayLow), dayHigh: num(meta.regularMarketDayHigh), yearLow: num(meta.fiftyTwoWeekLow), yearHigh: num(meta.fiftyTwoWeekHigh),
    volume: num(meta.regularMarketVolume), marketCap: null, avg50: null, avg200: null,
    exchange: meta.instrumentType === 'CRYPTOCURRENCY' ? 'CRYPTO' : String(meta.exchangeName ?? ''), currency: String(meta.currency ?? 'USD')
  };
}

async function sparkQuotes(symbols: string[]): Promise<Quote[]> {
  const out: Quote[] = [];
  for (let i = 0; i < symbols.length; i += 20) {
    const chunk = symbols.slice(i, i + 20);
    try {
      const j = await yjson(`/v7/finance/spark?symbols=${encodeURIComponent(chunk.join(','))}&range=1d&interval=1d`);
      if (j?.spark?.result) {
        for (const r of j.spark.result) { const q = metaQuote(r?.response?.[0]?.meta, r?.symbol); if (q) out.push(q); }
      } else if (j && typeof j === 'object') {
        for (const [sym, v] of Object.entries<any>(j)) {
          const closes = (v?.close ?? []).filter((x: any) => x != null);
          const price = closes.length ? Number(closes[closes.length - 1]) : null;
          const prev = num(v?.previousClose) ?? num(v?.chartPreviousClose);
          if (price) out.push({ symbol: sym, name: sym, price, change: prev ? price - prev : 0, changePct: prev ? (price / prev - 1) * 100 : 0, previousClose: prev, open: null, dayLow: null, dayHigh: null, yearLow: null, yearHigh: null, volume: null, marketCap: null, avg50: null, avg200: null, exchange: '', currency: '' });
        }
      }
    } catch (e) { logError(`spark (${chunk.length} símbolos)`, e); }
  }
  return out;
}

async function chartQuote(symbol: string): Promise<Quote | null> {
  try {
    const j = await yjson(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`);
    return metaQuote(j?.chart?.result?.[0]?.meta, symbol);
  } catch (e) { logError(`chart ${symbol}`, e); return null; }
}

/** Cripto desde CoinGecko: precio, variación de 24 h y valor de mercado de las 150 más grandes. */
const coingeckoTop = unstable_cache(async (): Promise<Quote[]> => {
  const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&price_change_percentage=24h', { headers: { Accept: 'application/json', 'User-Agent': UA }, cache: 'no-store' });
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
  const j: any[] = await r.json();
  const out = j.map((c) => {
    const price = num(c.current_price) ?? 0, pct = num(c.price_change_percentage_24h) ?? 0;
    return { symbol: `${String(c.symbol).toUpperCase()}-USD`, name: String(c.name), price, change: num(c.price_change_24h) ?? 0, changePct: pct,
      previousClose: price / (1 + pct / 100), open: null, dayLow: num(c.low_24h), dayHigh: num(c.high_24h), yearLow: num(c.atl), yearHigh: num(c.ath),
      volume: num(c.total_volume), marketCap: num(c.market_cap), avg50: null, avg200: null, exchange: 'CRYPTO', currency: 'USD' } as Quote;
  }).filter((q) => q.price > 0);
  if (!out.length) throw new Error('CoinGecko vacío');
  return out;
}, ['coingecko-v1'], { revalidate: 120 });

export async function getCryptoTop(): Promise<Quote[]> {
  try { return await coingeckoTop(); } catch (e) { logError('CoinGecko', e); return []; }
}

/** Valor de mercado de acciones: solo si Yahoo concede el permiso de sesión (se intenta y se guarda 12 horas). */
const capsCached = unstable_cache(async (key: string): Promise<Record<string, number>> => {
  const syms = key.split(',');
  const out: Record<string, number> = {};
  for (let i = 0; i < syms.length; i += 100) {
    const r = await yf.quote(syms.slice(i, i + 100), {}, NOVALIDATE);
    for (const q of Array.isArray(r) ? r : [r]) if (q?.symbol && num(q.marketCap)) out[q.symbol] = num(q.marketCap)!;
  }
  if (!Object.keys(out).length) throw new Error('Sin valores de mercado');
  return out;
}, ['caps-v1'], { revalidate: 43200 });

export async function getMarketCaps(symbols: string[]): Promise<Record<string, number>> {
  const s = Array.from(new Set(symbols.filter((x) => x && !/-USD$/.test(x)))).sort();
  if (!s.length) return {};
  try { return await capsCached(s.join(',')); } catch (e) { logError('valor de mercado (yahoo-finance2)', e); return {}; }
}

/** Pide cotizaciones: cripto a CoinGecko, el resto a Yahoo (de a 20, y de a una lo que falte). */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const crypto = symbols.filter((s) => /-USD$/.test(s));
  const rest = symbols.filter((s) => !/-USD$/.test(s));
  const out: Quote[] = [];
  if (crypto.length) {
    const top = new Map((await getCryptoTop()).map((q) => [q.symbol, q] as const));
    for (const s of crypto) { const q = top.get(s); if (q) out.push(q); else rest.push(s); }
  }
  if (rest.length) {
    const got = await sparkQuotes(rest);
    const have = new Set(got.map((q) => q.symbol));
    const missing = rest.filter((s) => !have.has(s)).slice(0, 25);
    for (let i = 0; i < missing.length; i += 5) {
      const r = await Promise.all(missing.slice(i, i + 5).map(chartQuote));
      for (const q of r) if (q) got.push(q);
    }
    out.push(...got);
  }
  return out.filter((q) => q.price > 0);
}

const quotesFast = unstable_cache(async (key: string) => {
  const r = await fetchQuotes(key.split(','));
  if (!r.length) throw new Error('Sin cotizaciones');
  return r;
}, ['q-fast-v2'], { revalidate: 30 });
const quotesSlow = unstable_cache(async (key: string) => {
  const r = await fetchQuotes(key.split(','));
  if (!r.length) throw new Error('Sin cotizaciones');
  return r;
}, ['q-slow-v2'], { revalidate: 300 });

/** Cotizaciones de muchos símbolos. revalidate ≤ 60 usa la caché corta (30 s); si no, la de 5 minutos. */
export async function getQuotes(symbols: string[], revalidate = 30): Promise<Quote[]> {
  const uniq = Array.from(new Set(symbols.filter(Boolean))).sort();
  if (!uniq.length) return [];
  try { return await (revalidate <= 60 ? quotesFast : quotesSlow)(uniq.join(',')); } catch { return []; }
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  return (await getQuotes([symbol], 30))[0] ?? null;
}

/** Las que más suben o bajan hoy en Estados Unidos (listas predefinidas de Yahoo, traen valor de mercado). */
export const getDayMovers = unstable_cache(async (kind: 'day_gainers' | 'day_losers'): Promise<Quote[]> => {
  const j = await yjson(`/v1/finance/screener/predefined/saved?scrIds=${kind}&count=25&formatted=false`);
  const out = (j?.finance?.result?.[0]?.quotes ?? []).map(normQuote).filter((q: Quote) => q.price > 0);
  if (!out.length) throw new Error('Lista del día vacía');
  return out;
}, ['movers-v2'], { revalidate: 300 });

export type SearchHit = { symbol: string; name: string; exchange: string; currency: string };
const searchCached = unstable_cache(async (query: string): Promise<SearchHit[]> => {
  const j = await yjson(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&listsCount=0`);
  return (j?.quotes ?? [])
    .filter((q: any) => q?.symbol && ['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'INDEX'].includes(q.quoteType))
    .map((q: any) => ({ symbol: q.symbol, name: q.longname ?? q.shortname ?? q.symbol, exchange: q.quoteType === 'CRYPTOCURRENCY' ? 'CRYPTO' : q.exchDisp ?? q.exchange ?? '', currency: '' }));
}, ['search-v2'], { revalidate: 3600 });

/** Busca en todas las bolsas del mundo por ticker y por nombre. */
export async function search(query: string): Promise<SearchHit[]> {
  try { return (await searchCached(query.trim().toLowerCase())).slice(0, 12); } catch (e) { logError('search', e); return []; }
}

export type NewsItem = { title: string; site: string; url: string; date: string };
const newsCached = unstable_cache(async (symbol: string, limit: number): Promise<NewsItem[]> => {
  const j = await yjson(`/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=${limit}&listsCount=0`);
  return (j?.news ?? []).map((n: any) => ({ title: n.title ?? '', site: n.publisher ?? '', url: n.link ?? '', date: iso(n.providerPublishTime) })).filter((n: NewsItem) => n.title);
}, ['news-v2'], { revalidate: 900 });

export async function getNews(symbol: string, limit = 8): Promise<NewsItem[]> {
  try { return await newsCached(symbol, limit); } catch (e) { logError(`news ${symbol}`, e); return []; }
}

export type Point = { t: string; p: number };
async function chartSeries(symbol: string, interval: '5m' | '60m' | '1d', from: string): Promise<Point[]> {
  const p1 = Math.floor(new Date(from + (from.length === 10 ? 'T00:00:00Z' : '')).getTime() / 1000);
  const p2 = Math.floor(Date.now() / 1000);
  const j = await yjson(`/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=${interval}&includePrePost=false`);
  const r = j?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const cl: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  const out = ts.map((t, i) => ({ t: iso(t), p: cl[i] == null ? NaN : Number(cl[i]) })).filter((x) => isFinite(x.p));
  if (!out.length) throw new Error(`Gráfico vacío ${symbol}`);
  return out;
}
const dailyCached = unstable_cache((symbol: string, from: string) => chartSeries(symbol, '1d', from), ['daily-v2'], { revalidate: 21600 });
const intraFast = unstable_cache((symbol: string, from: string) => chartSeries(symbol, '5m', from), ['intra5-v2'], { revalidate: 120 });
const intraHour = unstable_cache((symbol: string, from: string) => chartSeries(symbol, '60m', from), ['intra60-v2'], { revalidate: 1800 });

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
  const direct = ['EUR', 'GBP', 'AUD'];
  const inverse = ['JPY', 'HKD', 'BRL', 'ARS', 'CHF', 'CNY', 'CAD', 'MXN', 'KRW', 'INR', 'TWD'];
  const qs = await getQuotes([...direct.map((c) => `${c}USD=X`), ...inverse.map((c) => `${c}=X`)], 300);
  const fx: Record<string, number> = { USD: 1 };
  for (const q of qs) {
    const m = q.symbol.match(/^([A-Z]{3})(USD)?=X$/);
    if (!m || !q.price) continue;
    fx[m[1]] = m[2] ? q.price : 1 / q.price;
  }
  if (fx.GBP) fx.GBp = fx.GBP / 100;
  return fx;
}

/* ---------- Ficha de la empresa (necesita el permiso de sesión de Yahoo) ---------- */

const summaryCached = unstable_cache(async (symbol: string): Promise<any> => {
  try {
    return await yf.quoteSummary(symbol, { modules: ['price', 'assetProfile', 'summaryDetail', 'financialData', 'recommendationTrend', 'defaultKeyStatistics'] }, NOVALIDATE);
  } catch {
    return await yf.quoteSummary(symbol, { modules: ['price', 'summaryDetail'] }, NOVALIDATE);
  }
}, ['summary-v2'], { revalidate: 43200 });

async function getSummary(symbol: string): Promise<any | null> {
  if (/-USD$/.test(symbol)) return null;
  try { return await summaryCached(symbol); } catch (e) { logError(`ficha ${symbol}`, e); return null; }
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
