import 'server-only';
import { unstable_cache } from 'next/cache';
import { screen, sentiEnabled, type ScreenRow } from './sentisense';
import { getDaily, getGrades, getQuotes } from './yahoo';
import { UNIVERSE } from './themes';
import { marketOfSymbol } from './markets';
import { isoDaysAgo, technicals } from './technicals';

export type Candidate = {
  symbol: string; name: string; price: number | null; changePct: number | null; group: 'fuerte' | 'castigada';
  buyPct: number | null; analysts: number | null; upside: number | null; momentum: number | null;
  off52wHigh: number | null; ret1y: number | null; above200: boolean | null; social: number | null; volatility: number | null;
};

const r1 = (v: number | null | undefined) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);

function fromRow(r: ScreenRow, group: Candidate['group']): Candidate {
  return {
    symbol: r.ticker, name: r.name ?? r.ticker, price: r.currentPrice, changePct: r.changePercent, group,
    buyPct: r1(r.analystBuyRatioPct), analysts: r.analystCount, upside: r1(r.analystTargetUpsidePct), momentum: r.analystRatingMomentum30D,
    off52wHigh: r1(r.pctOff52wHigh), ret1y: r1(r.return1Y), above200: r.pctOff200dMa == null ? null : r.pctOff200dMa > 0,
    social: r1(r.sentiSenseScore7D), volatility: r1(r.volatility30D)
  };
}

/** Con SentiSense: dos filtros sobre ~1.000 acciones de EE.UU. con datos de analistas de Wall Street. */
async function fromSentiSense(): Promise<Candidate[] | null> {
  const [fuertes, castigadas] = await Promise.all([
    screen({
      filters: [
        { fieldName: 'ANALYST_COUNT', op: 'GTE', value: 10 },
        { fieldName: 'ANALYST_BUY_RATIO_PCT', op: 'GTE', value: 75 },
        { fieldName: 'ANALYST_TARGET_UPSIDE_PCT', op: 'GTE', value: 12 },
        { fieldName: 'MARKET_CAP', op: 'GTE', value: 10e9 }
      ],
      sort: { fieldName: 'ANALYST_TARGET_UPSIDE_PCT', dir: 'DESC' }
    }, 15),
    screen({
      filters: [
        { fieldName: 'PCT_OFF_52W_HIGH', op: 'LTE', value: -25 },
        { fieldName: 'ANALYST_COUNT', op: 'GTE', value: 6 },
        { fieldName: 'ANALYST_BUY_RATIO_PCT', op: 'GTE', value: 65 },
        { fieldName: 'ANALYST_TARGET_UPSIDE_PCT', op: 'GTE', value: 25 },
        { fieldName: 'MARKET_CAP', op: 'GTE', value: 2e9 }
      ],
      sort: { fieldName: 'ANALYST_TARGET_UPSIDE_PCT', dir: 'DESC' }
    }, 15)
  ]);
  if (!fuertes && !castigadas) return null;
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const r of fuertes?.rows ?? []) if (!seen.has(r.ticker)) { seen.add(r.ticker); out.push(fromRow(r, 'fuerte')); }
  for (const r of castigadas?.rows ?? []) if (!seen.has(r.ticker)) { seen.add(r.ticker); out.push(fromRow(r, 'castigada')); }
  return out;
}

/** Sin SentiSense: consenso de analistas de Finnhub sobre las empresas de los temas, más análisis técnico. */
async function fromFinnhub(): Promise<Candidate[]> {
  const symbols = UNIVERSE.filter((s) => marketOfSymbol(s) !== 'cr').slice(0, 45);
  const out: Candidate[] = [];
  for (let i = 0; i < symbols.length; i += 9) {
    const res = await Promise.all(symbols.slice(i, i + 9).map(async (s) => {
      const [g, daily] = await Promise.all([getGrades(s).catch(() => null), getDaily(s, isoDaysAgo(370))]);
      if (!g) return null;
      const buy = g.strongBuy + g.buy, total = buy + g.hold + g.sell + g.strongSell;
      if (total < 8 || buy / total < 0.7) return null;
      const last = daily[daily.length - 1]?.p ?? null;
      const t = technicals(daily, last ?? 0);
      const group: Candidate['group'] = t.distHigh1y != null && t.distHigh1y <= -25 ? 'castigada' : 'fuerte';
      return { symbol: s, name: s, price: last, changePct: null, group, buyPct: Math.round((buy / total) * 100), analysts: total, upside: null, momentum: null, off52wHigh: t.distHigh1y, ret1y: t.ret1y, above200: t.aboveSma200, social: null, volatility: t.volAnnual } as Candidate;
    }));
    out.push(...(res.filter(Boolean) as Candidate[]));
  }
  return out.sort((a, b) => (b.buyPct ?? 0) - (a.buyPct ?? 0)).slice(0, 24);
}

const candidatesC = unstable_cache(async () => {
  const list = (sentiEnabled() ? await fromSentiSense() : null) ?? (await fromFinnhub());
  // Nombres y precio actual desde Yahoo.
  const qs = await getQuotes(list.map((c) => c.symbol), 3600).catch(() => []);
  const q = new Map(qs.map((x) => [x.symbol, x] as const));
  const rows = list.map((c) => { const x = q.get(c.symbol); return x ? { ...c, name: x.name || c.name, price: x.price, changePct: x.changePct } : c; });
  if (!rows.length) throw new Error('Sin candidatas');
  return { rows, source: sentiEnabled() && rows.some((r) => r.upside != null) ? 'sentisense' : 'finnhub' };
}, ['joyitas-cands-v1'], { revalidate: 21600 });

export async function joyitaCandidates(): Promise<{ rows: Candidate[]; source: string }> {
  try { return await candidatesC(); } catch { return { rows: [], source: 'none' }; }
}
