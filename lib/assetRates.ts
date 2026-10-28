import 'server-only';
import { unstable_cache } from 'next/cache';
import { getDaily, getQuote } from './yahoo';
import { isoDaysAgo, technicals } from './technicals';
import { marketOfSymbol } from './markets';
import { ASSET_LIST, type Asset } from './assets';

export type Growth = { rate: number; years: number; risk: 1 | 2 | 3 | 4 };

/** Riesgo según la volatilidad anual del último año (cuánto sube y baja). */
const riskFromVol = (v: number | null): Growth['risk'] => (v == null ? 2 : v < 18 ? 1 : v < 28 ? 2 : v < 45 ? 3 : 4);

/**
 * Crecimiento anual compuesto en dólares de los últimos 10 años (o desde que cotiza),
 * con los cierres diarios de Yahoo Finance. Si cotiza en otra moneda, se descuenta lo que
 * esa moneda perdió o ganó contra el dólar en el mismo período.
 */
async function computeGrowth(symbol: string, currency = 'USD'): Promise<Growth | null> {
  const pts = await getDaily(symbol, isoDaysAgo(3653));
  const first = pts[0], last = pts[pts.length - 1];
  if (!first || !last || first.p <= 0) return null;
  const days = (new Date(last.t).getTime() - new Date(first.t).getTime()) / 864e5;
  if (days < 365) return null;
  let ratio = last.p / first.p;
  if (currency !== 'USD') {
    const fx = await getDaily(currency === 'GBp' ? 'GBP=X' : `${currency.toUpperCase()}=X`, first.t.slice(0, 10));
    const f0 = fx[0]?.p, f1 = fx[fx.length - 1]?.p;
    if (!f0 || !f1) return null;
    ratio = ratio / (f1 / f0); // unidades de moneda por dólar: si sube, la moneda se devaluó
  }
  const t = technicals(pts.slice(-260), last.p);
  return { rate: Math.round((Math.pow(ratio, 365.25 / days) - 1) * 1000) / 10, years: Math.max(1, Math.round(days / 365.25)), risk: riskFromVol(t.volAnnual) };
}

const growthC = unstable_cache(async (symbol: string, currency: string) => {
  const g = await computeGrowth(symbol, currency);
  if (!g) throw new Error(`Sin histórico ${symbol}`); // no se guarda: se reintenta
  return g;
}, ['growth-v1'], { revalidate: 86400 });

/** Cualquier activo que encuentre el buscador. */
export async function growthOf(symbol: string): Promise<(Asset & { currency: string }) | null> {
  const q = await getQuote(symbol).catch(() => null);
  if (!q) return null;
  const crypto = marketOfSymbol(symbol, q.exchange) === 'cr';
  const g = await growthC(symbol, crypto ? 'USD' : q.currency || 'USD').catch(() => null);
  if (!g) return null;
  const etf = /\bETF\b|Fund|Trust|iShares|Vanguard|SPDR|Invesco/i.test(q.name);
  return { t: symbol, name: q.name, kind: crypto ? 'crypto' : etf ? 'etf' : 'stock', risk: crypto ? 4 : g.risk, why: '', rate: g.rate, years: g.years, estimated: false, currency: q.currency || 'USD' };
}

/** Los activos sugeridos de la portada, recalculados una vez por día. */
const ratesC = unstable_cache(async (): Promise<Asset[]> => {
  const out: Asset[] = [];
  for (let i = 0; i < ASSET_LIST.length; i += 7) {
    out.push(...(await Promise.all(ASSET_LIST.slice(i, i + 7).map(async (a) => {
      const { fallback, ...base } = a;
      const g = await computeGrowth(a.t).catch(() => null);
      return g ? { ...base, rate: g.rate, years: g.years, estimated: false } : { ...base, rate: fallback, years: 10, estimated: true };
    }))));
  }
  if (out.every((a) => a.estimated)) throw new Error('Sin históricos'); // no se guarda: se reintenta
  return out;
}, ['asset-rates-v2'], { revalidate: 86400 });

export async function assetRates(): Promise<Asset[]> {
  try { return await ratesC(); }
  catch { return ASSET_LIST.map(({ fallback, ...a }) => ({ ...a, rate: fallback, years: 10, estimated: true })); }
}
