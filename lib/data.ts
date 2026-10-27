import 'server-only';
import { unstable_cache } from 'next/cache';
import { MARKETS, marketById, type Market, type MarketId } from './markets';
import { getCryptoTop, getDayMovers, getFx, getMarketCaps, getQuote, getQuotes, type Quote } from './yahoo';
import { TOP } from './topSymbols';

/** Una acción o moneda, en forma compacta para listas grandes. */
export type Row = { symbol: string; name: string; price: number; changePct: number; marketCap: number; market: MarketId; currency: string };

export type MarketSnap = {
  market: Market;
  index: Quote | null;
  changePct: number;
  capUsd: number;
  capDeltaUsd: number;
  count: number;
  ups: number;
  gainers: Row[];
  losers: Row[];
  largest: Row[];
  ok: boolean;
  /** true cuando no hay lista completa de la bolsa y se usan solo sus empresas más grandes. */
  partial: boolean;
};

const plausible = (q: Quote) => q.price > 0 && Math.abs(q.changePct) < 80;

/**
 * Las principales acciones (o monedas) de un mercado, ordenadas por valor de mercado.
 * Yahoo no da gratis la lista completa de una bolsa: se usan las de lib/topSymbols.ts
 * y, en Estados Unidos, también las listas del día de "más suben" y "más bajan".
 */
export type MarketRows = { rows: Row[]; partial: boolean };

export const marketRows = unstable_cache(async (id: string): Promise<MarketRows> => {
  const m = marketById(id);
  if (!m) return { rows: [], partial: true };
  let raw: Quote[];
  if (m.id === 'cr') raw = (await getCryptoTop()).slice(0, 40);
  else {
    const list = TOP[m.id] ?? [];
    const [quotes, caps] = await Promise.all([getQuotes(list, 120), getMarketCaps(list)]);
    const order = new Map(list.map((s, i) => [s, i] as const));
    raw = quotes.map((q) => ({ ...q, marketCap: q.marketCap ?? caps[q.symbol] ?? null }))
      .sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));
    if (m.id === 'us') {
      const [g, l] = await Promise.all([getDayMovers('day_gainers').catch(() => []), getDayMovers('day_losers').catch(() => [])]);
      raw.push(...g, ...l);
    }
  }
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const q of raw) {
    if (!plausible(q) || seen.has(q.symbol)) continue;
    seen.add(q.symbol);
    out.push({ symbol: q.symbol, name: q.name, price: q.price, changePct: Math.round(q.changePct * 100) / 100, marketCap: q.marketCap ?? 0, market: m.id, currency: q.currency || m.quoteCurrency || m.currency });
  }
  // Un resultado vacío casi siempre es un error de la fuente: se lanza para no guardarlo en caché.
  if (!out.length) throw new Error(`Sin datos para ${m.name}`);
  // Si hay valores de mercado se ordena por tamaño; si no, queda el orden de la lista (de mayor a menor).
  const hasCaps = out.filter((r) => r.marketCap > 0).length > out.length / 2;
  return { rows: hasCaps ? out.sort((a, b) => b.marketCap - a.marketCap) : out, partial: true };
}, ['market-rows-y2'], { revalidate: 120 });

const safeRows = (id: string): Promise<MarketRows> => marketRows(id).catch(() => ({ rows: [] as Row[], partial: true }));

export function snapshotFrom(m: Market, data: MarketRows, fx: Record<string, number>, index: Quote | null): MarketSnap {
  const rows = data.rows;
  const rate = fx[m.currency] ?? 1;
  let cap = 0, delta = 0;
  // Solo se informa el valor del mercado si la mayoría de sus empresas tiene ese dato.
  const withCap = rows.filter((q) => q.marketCap > 0).length;
  if (withCap >= rows.length * 0.6) {
    for (const q of rows) {
      const c = q.marketCap * rate;
      cap += c;
      delta += (c * q.changePct) / (100 + q.changePct);
    }
  }
  const big = rows.filter((q) => !q.marketCap || q.marketCap * rate >= m.minCap);
  const sorted = [...big].sort((a, b) => b.changePct - a.changePct);
  const capChange = cap - delta > 0 ? (delta / (cap - delta)) * 100 : 0;
  return {
    market: m,
    index,
    changePct: m.id === 'cr' ? capChange : index?.changePct ?? capChange,
    capUsd: cap,
    capDeltaUsd: delta,
    count: rows.length,
    ups: rows.filter((q) => q.changePct > 0).length,
    gainers: sorted.filter((q) => q.changePct > 0).slice(0, 10),
    losers: sorted.filter((q) => q.changePct < 0).reverse().slice(0, 10),
    largest: rows.slice(0, 15),
    ok: rows.length > 0,
    partial: data.partial
  };
}

const fxOrUsd = () => getFx().catch(() => ({ USD: 1 } as Record<string, number>));

export const marketSnapshotCached = unstable_cache(async (id: string) => {
  const m = marketById(id)!;
  const [rows, fx, index] = await Promise.all([safeRows(id), fxOrUsd(), getQuote(m.index)]);
  const snap = snapshotFrom(m, rows, fx, index);
  if (!snap.ok && !index) throw new Error(`Sin datos para ${m.name}`);
  return snap;
}, ['market-snap-y2'], { revalidate: 60 });

/** Igual que marketSnapshotCached pero nunca falla: si no hay datos devuelve una foto vacía. */
export async function marketSnapshotSafe(id: string): Promise<MarketSnap> {
  try { return await marketSnapshotCached(id); } catch { return snapshotFrom(marketById(id)!, { rows: [], partial: false }, { USD: 1 }, null); }
}

/** Foto del mundo: índices, valor de cada mercado y sus rankings. */
export const worldCached = unstable_cache(async () => {
  const fx = await fxOrUsd();
  const idx = await getQuotes(MARKETS.map((m) => m.index), 60);
  const bySym = new Map(idx.map((q) => [q.symbol, q] as const));
  const snaps = (await Promise.all(MARKETS.map(async (m) => {
    try { return snapshotFrom(m, await safeRows(m.id), fx, bySym.get(m.index) ?? null); } catch { return null; }
  }))).filter((s): s is MarketSnap => !!s && (s.ok || !!s.index));
  if (!snaps.length) throw new Error('Sin datos de ningún mercado');
  const geo = snaps.filter((s) => s.market.id !== 'cr');
  const avg = geo.length ? geo.reduce((a, s) => a + s.changePct, 0) / geo.length : 0;
  const stocks = geo.flatMap((s) => [...s.gainers, ...s.losers]);
  return {
    snaps,
    avg,
    gainers: stocks.filter((q) => q.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 8),
    losers: stocks.filter((q) => q.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 8)
  };
}, ['world-y2'], { revalidate: 60 });

export type World = Awaited<ReturnType<typeof worldCached>>;
/** Nunca falla: si el proveedor no responde, devuelve un mundo vacío y la página muestra un aviso. */
export async function worldSafe(): Promise<World & { failed: boolean }> {
  try { return { ...(await worldCached()), failed: false }; } catch { return { snaps: [], avg: 0, gainers: [], losers: [], failed: true }; }
}

export type ExploreSort = 'valor' | 'suben' | 'bajan' | 'nombre';

/** Las principales acciones de un mercado, ordenadas y paginadas. */
export async function explore(opts: { market: string; sort?: ExploreSort; page?: number; per?: number }) {
  const m = marketById(opts.market) ?? MARKETS[0];
  const per = opts.per ?? 50;
  const data = await safeRows(m.id);
  let rows = data.rows;
  const sort = opts.sort ?? 'valor';
  if (sort === 'suben') rows = [...rows].sort((a, b) => b.changePct - a.changePct);
  else if (sort === 'bajan') rows = [...rows].sort((a, b) => a.changePct - b.changePct);
  else if (sort === 'nombre') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(Math.max(1, opts.page ?? 1), pages);
  return { market: m, total: rows.length, page, pages, per, partial: data.partial, rows: rows.slice((page - 1) * per, page * per) };
}

export function worldTitle(c: number) {
  if (c > 1) return ['Hoy los mercados están', 'de fiesta', ''];
  if (c > 0.3) return ['Hoy el mundo amaneció con', 'ganas', ''];
  if (c > -0.3) return ['Hoy los mercados están', 'tranquilos', ''];
  if (c > -1) return ['Hoy los mercados vienen', 'flojos', ''];
  return ['Hoy es un', 'día difícil', 'en los mercados'];
}
