import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * Finnhub (plan gratis, 60 consultas por minuto): ficha de la empresa, ratios y opinión de analistas.
 * Reemplaza a la ficha de Yahoo, que desde Vercel responde "Too Many Requests".
 * La clave va solo en Vercel como FINNHUB_API_KEY (nunca en el código).
 */
export const finnhubEnabled = () => !!process.env.FINNHUB_API_KEY?.trim();
export let finnhubError: string | null = null;

class RateLimited extends Error {}

async function fh(path: string): Promise<any | null> {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`, { cache: 'no-store', signal: ctl.signal });
    if (r.status === 429) { finnhubError = 'Límite de 60 consultas por minuto'; throw new RateLimited('429'); }
    if (!r.ok) { if (!path.startsWith('/stock/price-target')) finnhubError = `${path.split('?')[0]}: HTTP ${r.status}`; return null; } // 403 = dato pago o bolsa no incluida en el plan gratis
    return await r.json();
  } finally { clearTimeout(timer); }
}

/** Finnhub usa los mismos sufijos de bolsa que Yahoo (.L, .TO, .DE, .T…); la cripto no tiene ficha. */
const fhSymbol = (s: string) => s;

/** Rubros de Finnhub llevados a los de Yahoo, para usar las mismas traducciones y filtros. */
const INDUSTRY: Record<string, string> = {
  Technology: 'Technology', Semiconductors: 'Technology', 'Electrical Equipment': 'Technology', Communications: 'Communication Services',
  Media: 'Communication Services', Telecommunication: 'Communication Services', 'Telecommunication Services': 'Communication Services',
  Banking: 'Financial Services', 'Financial Services': 'Financial Services', Insurance: 'Financial Services', Finance: 'Financial Services',
  Pharmaceuticals: 'Healthcare', Biotechnology: 'Healthcare', 'Health Care': 'Healthcare', 'Life Sciences Tools & Services': 'Healthcare',
  Retail: 'Consumer Cyclical', Automobiles: 'Consumer Cyclical', 'Hotels, Restaurants & Leisure': 'Consumer Cyclical', 'Textiles, Apparel & Luxury Goods': 'Consumer Cyclical',
  'Consumer products': 'Consumer Defensive', 'Food Products': 'Consumer Defensive', Beverages: 'Consumer Defensive', Tobacco: 'Consumer Defensive',
  Energy: 'Energy', 'Oil & Gas': 'Energy', Utilities: 'Utilities', 'Real Estate': 'Real Estate',
  'Aerospace & Defense': 'Industrials', Airlines: 'Industrials', Machinery: 'Industrials', 'Industrial Conglomerates': 'Industrials',
  Logistics: 'Industrials', 'Road & Rail': 'Industrials', Construction: 'Industrials', Building: 'Industrials', Marine: 'Industrials',
  'Commercial Services & Supplies': 'Industrials', Chemicals: 'Basic Materials', Metals: 'Basic Materials', 'Metals & Mining': 'Basic Materials',
  Mining: 'Basic Materials', Packaging: 'Basic Materials', Trading: 'Industrials'
};

const cached = <T,>(key: string, fn: (s: string) => Promise<T>) =>
  unstable_cache(fn, [key], { revalidate: 43200 });

const profileC = cached('fh-profile-v1', async (s: string) => (await fh(`/stock/profile2?symbol=${encodeURIComponent(fhSymbol(s))}`)) ?? {});
const metricC = cached('fh-metric-v1', async (s: string) => (await fh(`/stock/metric?symbol=${encodeURIComponent(fhSymbol(s))}&metric=all`))?.metric ?? {});
const recoC = cached('fh-reco-v1', async (s: string) => (await fh(`/stock/recommendation?symbol=${encodeURIComponent(fhSymbol(s))}`)) ?? []);
const targetC = cached('fh-target-v1', async (s: string) => (await fh(`/stock/price-target?symbol=${encodeURIComponent(fhSymbol(s))}`)) ?? {});

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!finnhubEnabled()) return null;
  try { return await fn(); } catch (e: any) { if (!(e instanceof RateLimited)) finnhubError = String(e?.message ?? e).slice(0, 160); return null; }
}
const n = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null);

export async function fhProfile(s: string) {
  const [p, m] = await Promise.all([safe(() => profileC(s)), safe(() => metricC(s))]);
  if (!p?.name && !m) return null;
  return {
    name: p?.name ?? '', sector: p?.finnhubIndustry ? INDUSTRY[p.finnhubIndustry] ?? p.finnhubIndustry : '', industry: p?.finnhubIndustry ?? '',
    country: p?.country ?? '', currency: p?.currency ?? '', website: p?.weburl ?? '', exchange: p?.exchange ?? '',
    marketCap: n(p?.marketCapitalization) != null ? p.marketCapitalization * 1e6 : n(m?.marketCapitalization) != null ? m.marketCapitalization * 1e6 : null,
    beta: n(m?.beta)
  };
}

export async function fhRatios(s: string) {
  const m = await safe(() => metricC(s));
  if (!m) return null;
  const pe = n(m.peTTM) ?? n(m.peBasicExclExtraTTM) ?? n(m.peNormalizedAnnual);
  const dy = n(m.currentDividendYieldTTM) ?? n(m.dividendYieldIndicatedAnnual);
  if (pe == null && dy == null) return null;
  return { pe, dividendYield: dy };
}

export async function fhGrades(s: string) {
  const r = await safe(() => recoC(s));
  const t = Array.isArray(r) ? r[0] : null;
  if (!t) return null;
  const g = { strongBuy: t.strongBuy ?? 0, buy: t.buy ?? 0, hold: t.hold ?? 0, sell: t.sell ?? 0, strongSell: t.strongSell ?? 0 };
  const total = g.strongBuy + g.buy + g.hold + g.sell + g.strongSell;
  if (!total) return null;
  const score = (g.strongBuy * 1 + g.buy * 2 + g.hold * 3 + g.sell * 4 + g.strongSell * 5) / total;
  return { ...g, consensus: score < 1.8 ? 'strong_buy' : score < 2.5 ? 'buy' : score < 3.5 ? 'hold' : score < 4.2 ? 'sell' : 'strong_sell' };
}

/** El precio objetivo es pago en Finnhub: si el plan no lo incluye, devuelve null y se usa Yahoo. */
export async function fhTarget(s: string) {
  const t = await safe(() => targetC(s));
  if (!t || n(t.targetMean) == null) return null;
  return { high: n(t.targetHigh), low: n(t.targetLow), consensus: n(t.targetMean), median: n(t.targetMedian) };
}
