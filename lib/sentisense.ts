import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * SentiSense (https://sentisense.ai): sentimiento en redes (Reddit, X, YouTube, noticias), operaciones de
 * políticos de EE.UU. y un filtro de acciones con datos de analistas. El plan gratis da 1.000 consultas
 * por mes, así que todo se guarda 12 horas: ~20 consultas por día en total.
 * La clave va solo en Vercel como SENTISENSE_API_KEY.
 */
const BASE = 'https://app.sentisense.ai';
export const sentiEnabled = () => !!process.env.SENTISENSE_API_KEY?.trim();
export let sentiError: string | null = null;
let blockedUntil = 0;

async function ss(path: string, body?: unknown): Promise<any> {
  const key = process.env.SENTISENSE_API_KEY?.trim();
  if (!key) throw new Error('Falta SENTISENSE_API_KEY');
  if (Date.now() < blockedUntil) throw new Error(sentiError ?? 'SentiSense en pausa');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-SentiSense-API-Key': key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: ctl.signal
    });
    if (!r.ok) {
      sentiError = `${path.split('?')[0]}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`;
      // Clave inválida o cupo agotado: no se insiste por 30 minutos para no gastar consultas.
      if (r.status === 401 || r.status === 403 || r.status === 429) blockedUntil = Date.now() + 30 * 60_000;
      throw new Error(sentiError);
    }
    return await r.json();
  } finally { clearTimeout(timer); }
}

const H12 = 43200;
const unwrap = (j: any) => (j && typeof j === 'object' && 'data' in j && 'isPreview' in j ? j.data : j);

/* ---------- Filtro de acciones (una consulta trae hasta 100 empresas con todos sus datos) ---------- */

export type ScreenRow = {
  ticker: string; name?: string; marketCap: number | null; currentPrice: number | null; changePercent: number | null;
  sentiSenseScore7D: number | null; sentiSenseScore1M: number | null; scoreChange7D: number | null; socialDominance: number | null; mentionVelocity: number | null;
  analystBuyRatioPct: number | null; analystTargetUpsidePct: number | null; analystCount: number | null; analystRatingMomentum30D: number | null;
  pctOff52wHigh: number | null; pctOff52wLow: number | null; pctOff200dMa: number | null; pctOff50dMa: number | null; maCrossState: number | null;
  return1M: number | null; return3M: number | null; return1Y: number | null; volatility30D: number | null; ratingLetter: string | null;
};
type Filter = { fieldName: string; op: 'GTE' | 'LTE' | 'GT' | 'LT' | 'EQ' | 'IN'; value?: number; values?: string[] };
export type Plan = { filters: Filter[]; sort: { fieldName: string; dir: 'ASC' | 'DESC' } };

const n = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null);
function normRow(r: any): ScreenRow {
  return {
    ticker: String(r.ticker ?? r.symbol ?? ''), name: r.name ?? r.companyName ?? undefined,
    marketCap: n(r.marketCap), currentPrice: n(r.currentPrice ?? r.price), changePercent: n(r.changePercent),
    sentiSenseScore7D: n(r.sentiSenseScore7D), sentiSenseScore1M: n(r.sentiSenseScore1M), scoreChange7D: n(r.scoreChange7D),
    socialDominance: n(r.socialDominance), mentionVelocity: n(r.mentionVelocity),
    analystBuyRatioPct: n(r.analystBuyRatioPct), analystTargetUpsidePct: n(r.analystTargetUpsidePct), analystCount: n(r.analystCount),
    analystRatingMomentum30D: n(r.analystRatingMomentum30D), pctOff52wHigh: n(r.pctOff52wHigh), pctOff52wLow: n(r.pctOff52wLow),
    pctOff200dMa: n(r.pctOff200dMa), pctOff50dMa: n(r.pctOff50dMa), maCrossState: n(r.maCrossState),
    return1M: n(r.return1M), return3M: n(r.return3M), return1Y: n(r.return1Y), volatility30D: n(r.volatility30D),
    ratingLetter: typeof r.ratingLetter === 'string' ? r.ratingLetter : null
  };
}

const screenC = unstable_cache(async (planJson: string, limit: number) => {
  const j = await ss('/api/v1/screener/execute', { plan: JSON.parse(planJson), limit });
  const rows = (j?.results ?? []).map(normRow).filter((r: ScreenRow) => r.ticker);
  return { rows, matched: Number(j?.matched ?? rows.length) };
}, ['ss-screen-v1'], { revalidate: H12 });

export async function screen(plan: Plan, limit = 25) {
  if (!sentiEnabled()) return null;
  try { return await screenC(JSON.stringify(plan), limit); } catch { return null; }
}

/* ---------- Políticos de EE.UU. (ley STOCK Act) ---------- */

export type PolTrade = {
  politicianName: string; chamber: string; party: string; state: string; imageUrl?: string; ticker: string | null; assetDescription: string;
  transactionType: string; transactionDate: string; disclosureDate: string; amountRange: string; urlSlug?: string;
};
export type PolMember = { displayName: string; party: string; chamber: string; state: string; tradeCount: number | null; purchases: number | null; sales: number | null; imageUrl?: string; latest: string };

const polC = unstable_cache(async () => {
  const [act, mem] = await Promise.all([ss('/api/v1/politicians/activity?lookbackDays=60'), ss('/api/v1/politicians/members')]);
  const trades: PolTrade[] = (unwrap(act) ?? []).slice(0, 20).map((t: any) => ({
    politicianName: String(t.politicianName ?? `${t.firstName ?? ''} ${t.lastName ?? ''}`).trim(), chamber: String(t.chamber ?? ''), party: String(t.party ?? ''),
    state: String(t.state ?? ''), imageUrl: t.imageUrl ?? undefined, ticker: t.ticker ?? null, assetDescription: String(t.assetDescription ?? ''),
    transactionType: String(t.transactionType ?? ''), transactionDate: String(t.transactionDate ?? ''), disclosureDate: String(t.disclosureDate ?? ''),
    amountRange: String(t.amountRange ?? ''), urlSlug: t.urlSlug ?? undefined
  }));
  const rawMembers = unwrap(mem);
  const list: any[] = Array.isArray(rawMembers) ? rawMembers : rawMembers?.members ?? [];
  const members: PolMember[] = list.slice(0, 10).map((m: any) => ({
    displayName: String(m.displayName ?? m.politicianName ?? m.name ?? ''), party: String(m.party ?? ''), chamber: String(m.chamber ?? ''), state: String(m.state ?? ''),
    tradeCount: n(m.totalTrades), purchases: n(m.purchaseCount), sales: n(m.saleCount), imageUrl: m.imageUrl ?? undefined, latest: String(m.latestTradeDate ?? '')
  }));
  return { trades, members, totalTrades: Number(act?.totalCount ?? trades.length), preview: !!act?.isPreview };
}, ['ss-pol-v1'], { revalidate: H12 });

export async function politicians() {
  if (!sentiEnabled()) return null;
  try { return await polC(); } catch { return null; }
}

/* ---------- Reddit y humor del mercado ---------- */

export type TrackerRow = { rank: number; ticker: string | null; name: string; metrics: { label: string; value: any; unit: string }[] };
const trackerC = unstable_cache(async (id: string) => {
  const d = unwrap(await ss(`/api/v1/trackers/${id}`));
  const rows: TrackerRow[] = (d?.rows ?? []).slice(0, 15).map((r: any, i: number) => {
    const id0 = String(r.rowId ?? r.ticker ?? '');
    return { rank: Number(r.rank ?? i + 1), ticker: /^[A-Z][A-Z.\-]{0,6}$/.test(id0) ? id0 : null, name: String(r.name ?? id0), metrics: (r.metrics ?? []).map((m: any) => ({ label: String(m.label ?? ''), value: m.value, unit: String(m.unit ?? '') })) };
  });
  return { rows, asOf: d?.asOf ?? null };
}, ['ss-tracker-v1'], { revalidate: H12 });

export async function tracker(id: 'reddit-picks' | 'sentiment-leaderboard' | 'sentiment-movers' | 'media-darlings') {
  if (!sentiEnabled()) return null;
  try { return await trackerC(id); } catch { return null; }
}

const moodC = unstable_cache(async () => {
  const j = await ss('/api/v2/market-mood?days=30');
  const m = unwrap(j)?.market ?? j?.market;
  return m ? { score: n(m.currentScore), phase: String(m.phase ?? ''), weeklyChange: n(m.weeklyChange) } : null;
}, ['ss-mood-v1'], { revalidate: H12 });

export async function marketMood() {
  if (!sentiEnabled()) return null;
  try { return await moodC(); } catch { return null; }
}

export const PHASE_ES: Record<string, string> = {
  'Extreme Fear': 'Pánico', Fear: 'Miedo', Anxiety: 'Nervios', Neutral: 'Neutral', Optimism: 'Optimismo', Greed: 'Euforia', 'Extreme Greed': 'Euforia total'
};
