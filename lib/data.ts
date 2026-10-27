import 'server-only';
import { unstable_cache } from 'next/cache';
import { MARKETS, marketById, type Market, type MarketId } from './markets';
import { getCryptoQuotes, getExchangeQuotes, getFx, getQuote, getQuotes, screenerSymbols, type Quote } from './fmp';

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
};

const plausible = (q: Quote) => q.price > 0 && Math.abs(q.changePct) < 80 && (q.marketCap ?? 0) > 0;

/**
 * Todas las acciones (o monedas) de un mercado, ordenadas por valor de mercado.
 * Las bolsas enteras son respuestas grandes, así que se piden cada 15 minutos;
 * los precios que se ven en pantalla se refrescan aparte cada 20 segundos.
 */
export const marketRows = unstable_cache(async (id: string): Promise<Row[]> => {
  const m = marketById(id);
  if (!m) return [];
  const raw = m.id === 'cr' ? await getCryptoQuotes() : (await Promise.all(m.exchanges.map(getExchangeQuotes))).flat();
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const q of raw) {
    if (!plausible(q) || seen.has(q.symbol)) continue;
    seen.add(q.symbol);
    out.push({ symbol: q.symbol, name: q.name, price: q.price, changePct: Math.round(q.changePct * 100) / 100, marketCap: q.marketCap!, market: m.id, currency: m.quoteCurrency ?? m.currency });
  }
  // Un resultado vacío casi siempre es un error del proveedor: se lanza para no guardarlo en caché 15 minutos.
  if (!out.length) throw new Error(`Sin datos para ${m.name}`);
  return out.sort((a, b) => b.marketCap - a.marketCap);
}, ['market-rows-v3'], { revalidate: 900 });

const safeRows = (id: string) => marketRows(id).catch(() => [] as Row[]);

/** Símbolos de un rubro dentro de un mercado (screener de FMP, sin ETFs ni fondos). Se actualiza una vez por día. */
export const sectorSymbols = unstable_cache(async (id: string, sector: string): Promise<string[]> => {
  const m = marketById(id);
  if (!m || m.id === 'cr') return [];
  const out = (await Promise.all(m.exchanges.map((exchange) => screenerSymbols({ exchange, sector })))).flat();
  if (!out.length) throw new Error('Sin datos del screener');
  return out;
}, ['sector-symbols-v2'], { revalidate: 86400 });

export function snapshotFrom(m: Market, rows: Row[], fx: Record<string, number>, index: Quote | null): MarketSnap {
  const rate = fx[m.currency] ?? 1;
  let cap = 0, delta = 0;
  for (const q of rows) {
    const c = q.marketCap * rate;
    cap += c;
    delta += (c * q.changePct) / (100 + q.changePct);
  }
  const big = rows.filter((q) => q.marketCap * rate >= m.minCap);
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
    ok: rows.length > 0
  };
}

const fxOrUsd = () => getFx().catch(() => ({ USD: 1 } as Record<string, number>));

export const marketSnapshotCached = unstable_cache(async (id: string) => {
  const m = marketById(id)!;
  const [rows, fx, index] = await Promise.all([safeRows(id), fxOrUsd(), getQuote(m.index)]);
  const snap = snapshotFrom(m, rows, fx, index);
  if (!snap.ok && !index) throw new Error(`Sin datos para ${m.name}`);
  return snap;
}, ['market-snap-v3'], { revalidate: 120 });

/** Igual que marketSnapshotCached pero nunca falla: si no hay datos devuelve una foto vacía. */
export async function marketSnapshotSafe(id: string): Promise<MarketSnap> {
  try { return await marketSnapshotCached(id); } catch { return snapshotFrom(marketById(id)!, [], { USD: 1 }, null); }
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
}, ['world-v3'], { revalidate: 120 });

export type World = Awaited<ReturnType<typeof worldCached>>;
/** Nunca falla: si el proveedor no responde, devuelve un mundo vacío y la página muestra un aviso. */
export async function worldSafe(): Promise<World & { failed: boolean }> {
  try { return { ...(await worldCached()), failed: false }; } catch { return { snaps: [], avg: 0, gainers: [], losers: [], failed: true }; }
}

export type ExploreSort = 'valor' | 'suben' | 'bajan' | 'nombre';

/** Todas las acciones de un mercado, filtradas por rubro, ordenadas y paginadas. */
export async function explore(opts: { market: string; sector?: string; sort?: ExploreSort; page?: number; per?: number }) {
  const m = marketById(opts.market) ?? MARKETS[0];
  const per = opts.per ?? 50;
  let rows = await safeRows(m.id);
  if (opts.sector && m.id !== 'cr') {
    const set = new Set(await sectorSymbols(m.id, opts.sector).catch(() => [] as string[]));
    rows = rows.filter((r) => set.has(r.symbol));
  }
  const sort = opts.sort ?? 'valor';
  if (sort === 'suben') rows = [...rows].sort((a, b) => b.changePct - a.changePct);
  else if (sort === 'bajan') rows = [...rows].sort((a, b) => a.changePct - b.changePct);
  else if (sort === 'nombre') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(Math.max(1, opts.page ?? 1), pages);
  return { market: m, total: rows.length, page, pages, per, rows: rows.slice((page - 1) * per, page * per) };
}

export function worldTitle(c: number) {
  if (c > 1) return ['Hoy los mercados están', 'de fiesta', ''];
  if (c > 0.3) return ['Hoy el mundo amaneció con', 'ganas', ''];
  if (c > -0.3) return ['Hoy los mercados están', 'tranquilos', ''];
  if (c > -1) return ['Hoy los mercados vienen', 'flojos', ''];
  return ['Hoy es un', 'día difícil', 'en los mercados'];
}
