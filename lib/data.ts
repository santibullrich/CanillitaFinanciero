import 'server-only';
import { unstable_cache } from 'next/cache';
import { MARKETS, marketById, type Market, type MarketId } from './markets';
import { getCryptoQuotes, getExchangeQuotes, getFx, getQuote, getQuotes, type Quote } from './fmp';

export type Row = Quote & { market: MarketId; currency: string };

export type MarketSnap = {
  market: Market;
  index: Quote | null;
  changePct: number;
  capUsd: number;
  capDeltaUsd: number;
  count: number;
  gainers: Row[];
  losers: Row[];
  largest: Row[];
  ups: number;
  ok: boolean;
};

const plausible = (q: Quote) => q.price > 0 && Math.abs(q.changePct) < 80;

export async function marketSnapshot(m: Market, fx: Record<string, number>, index: Quote | null): Promise<MarketSnap> {
  const rate = fx[m.currency] ?? 1;
  const raw = m.id === 'cr' ? await getCryptoQuotes() : (await Promise.all(m.exchanges.map(getExchangeQuotes))).flat();
  const rows: Row[] = raw.filter((q) => plausible(q) && q.marketCap && q.marketCap > 0).map((q) => ({ ...q, market: m.id, currency: m.currency }));
  const big = rows.filter((q) => (q.marketCap ?? 0) * rate >= m.minCap);
  let cap = 0, delta = 0;
  for (const q of rows) {
    const c = (q.marketCap ?? 0) * rate;
    cap += c;
    delta += (c * q.changePct) / (100 + q.changePct);
  }
  const sorted = [...big].sort((a, b) => b.changePct - a.changePct);
  const capChange = cap - delta > 0 ? (delta / (cap - delta)) * 100 : 0;
  return {
    market: m,
    index,
    changePct: m.id === 'cr' ? capChange : index?.changePct ?? capChange,
    capUsd: cap,
    capDeltaUsd: delta,
    count: rows.length,
    gainers: sorted.filter((q) => q.changePct > 0).slice(0, 10),
    losers: sorted.filter((q) => q.changePct < 0).reverse().slice(0, 10),
    largest: [...rows].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)).slice(0, 15),
    ups: rows.filter((q) => q.changePct > 0).length,
    ok: rows.length > 0
  };
}

/** Foto del mundo: índices, valor de cada mercado y sus rankings. */
export async function world() {
  const fx = await getFx().catch(() => ({ USD: 1 } as Record<string, number>));
  const idx = await getQuotes(MARKETS.map((m) => m.index), 60);
  const bySym = new Map(idx.map((q) => [q.symbol, q]));
  const snaps = await Promise.all(MARKETS.map((m) => marketSnapshot(m, fx, bySym.get(m.index) ?? null).catch(() => null)));
  const ok = snaps.filter(Boolean) as MarketSnap[];
  const geo = ok.filter((s) => s.market.id !== 'cr');
  const avg = geo.length ? geo.reduce((a, s) => a + s.changePct, 0) / geo.length : 0;
  const allStocks = geo.flatMap((s) => [...s.gainers, ...s.losers]);
  return {
    fx,
    snaps: ok,
    avg,
    gainers: [...allStocks].filter((q) => q.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 8),
    losers: [...allStocks].filter((q) => q.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 8)
  };
}

export function worldTitle(c: number) {
  if (c > 1) return ['Hoy los mercados están', 'de fiesta', ''];
  if (c > 0.3) return ['Hoy el mundo amaneció con', 'ganas', ''];
  if (c > -0.3) return ['Hoy los mercados están', 'tranquilos', ''];
  if (c > -1) return ['Hoy los mercados vienen', 'flojos', ''];
  return ['Hoy es un', 'día difícil', 'en los mercados'];
}

/** Versiones cacheadas 2 minutos: las listas de una bolsa entera son grandes y no conviene pedirlas en cada visita. */
export const worldCached = unstable_cache(async () => world(), ['world-v1'], { revalidate: 120 });
export const marketSnapshotCached = unstable_cache(async (id: string) => {
  const m = marketById(id)!;
  const [fx, index] = await Promise.all([getFx().catch(() => ({ USD: 1 } as Record<string, number>)), getQuote(m.index)]);
  return marketSnapshot(m, fx, index);
}, ['market-v1'], { revalidate: 120 });
