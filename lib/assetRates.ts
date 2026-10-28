import 'server-only';
import { unstable_cache } from 'next/cache';
import { getDaily, getQuote, getWeeklyTotalReturn } from './yahoo';
import { isoDaysAgo } from './technicals';
import { marketOfSymbol } from './markets';
import { ASSET_LIST, type Asset } from './assets';

export type Growth = { rate: number; years: number; risk: 1 | 2 | 3 | 4 };

/** Riesgo según la volatilidad anual del último año (cuánto sube y baja). */
const riskFromVol = (v: number | null): Growth['risk'] => (v == null ? 2 : v < 18 ? 1 : v < 28 ? 2 : v < 45 ? 3 : 4);

/**
 * Rendimiento total anual compuesto en dólares de los últimos 10 años (o desde que cotiza):
 * precio más dividendos e intereses reinvertidos, con datos semanales de Yahoo Finance.
 * Si cotiza en otra moneda, se descuenta lo que esa moneda perdió o ganó contra el dólar.
 */
async function computeGrowth(symbol: string, currency = 'USD'): Promise<Growth | null> {
  const pts = await getWeeklyTotalReturn(symbol, isoDaysAgo(3653));
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
  // Volatilidad anual del último año con los retornos semanales.
  const w = pts.slice(-53), rets = w.slice(1).map((x, i) => Math.log(x.p / w[i].p));
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const vol = rets.length > 10 ? Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1)) * Math.sqrt(52) * 100 : null;
  return { rate: Math.round((Math.pow(ratio, 365.25 / days) - 1) * 1000) / 10, years: Math.max(1, Math.round(days / 365.25)), risk: riskFromVol(vol) };
}

const growthC = unstable_cache(async (symbol: string, currency: string) => {
  const g = await computeGrowth(symbol, currency);
  if (!g) throw new Error(`Sin histórico ${symbol}`); // no se guarda: se reintenta
  return g;
}, ['growth-v2'], { revalidate: 86400 });

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
}, ['asset-rates-v3'], { revalidate: 86400 });

export async function assetRates(): Promise<Asset[]> {
  try { return await ratesC(); }
  catch { return ASSET_LIST.map(({ fallback, ...a }) => ({ ...a, rate: fallback, years: 10, estimated: true })); }
}
