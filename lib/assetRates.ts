import 'server-only';
import { unstable_cache } from 'next/cache';
import { getDaily } from './yahoo';
import { isoDaysAgo } from './technicals';
import { ASSET_LIST, type Asset } from './assets';

/**
 * Crecimiento anual compuesto de cada activo en los últimos 10 años (o desde que existe),
 * calculado con los cierres diarios de Yahoo Finance. Se recalcula una vez por día.
 */
const ratesC = unstable_cache(async (): Promise<Asset[]> => {
  const from = isoDaysAgo(3653);
  const out: Asset[] = [];
  for (let i = 0; i < ASSET_LIST.length; i += 7) {
    out.push(...(await Promise.all(ASSET_LIST.slice(i, i + 7).map(async (a) => {
      const pts = await getDaily(a.t, from);
      const first = pts[0], last = pts[pts.length - 1];
      const days = first && last ? (new Date(last.t).getTime() - new Date(first.t).getTime()) / 864e5 : 0;
      const { fallback, ...base } = a;
      if (first && last && first.p > 0 && days > 700) {
        const cagr = (Math.pow(last.p / first.p, 365.25 / days) - 1) * 100;
        return { ...base, rate: Math.round(cagr * 10) / 10, years: Math.round(days / 365.25), estimated: false };
      }
      return { ...base, rate: fallback, years: 10, estimated: true };
    }))));
  }
  if (out.every((a) => a.estimated)) throw new Error('Sin históricos'); // no se guarda: se reintenta
  return out;
}, ['asset-rates-v1'], { revalidate: 86400 });

export async function assetRates(): Promise<Asset[]> {
  try { return await ratesC(); }
  catch { return ASSET_LIST.map(({ fallback, ...a }) => ({ ...a, rate: fallback, years: 10, estimated: true })); }
}
