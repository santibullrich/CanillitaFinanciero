import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * Sentimiento cripto, gratis y sin clave:
 * - CoinGecko: las monedas más buscadas del día y el voto de su comunidad (cuántos creen que sube).
 * - alternative.me: índice de miedo y codicia del mercado cripto (0 = pánico, 100 = euforia).
 */
export type TrendingCoin = { symbol: string; name: string; rank: number | null; changePct: number | null; bullishPct: number | null };

const H = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 CanillitaFinanciero' };

const trendingC = unstable_cache(async (): Promise<TrendingCoin[]> => {
  const r = await fetch('https://api.coingecko.com/api/v3/search/trending', { headers: H, cache: 'no-store' });
  if (!r.ok) throw new Error(`CoinGecko trending ${r.status}`);
  const j = await r.json();
  const coins = (j?.coins ?? []).slice(0, 8).map((c: any) => c.item);
  const out = await Promise.all(coins.map(async (c: any): Promise<TrendingCoin> => {
    let bullishPct: number | null = null;
    try {
      const d = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(c.id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`, { headers: H, cache: 'no-store' });
      if (d.ok) bullishPct = (await d.json())?.sentiment_votes_up_percentage ?? null;
    } catch { /* sin votos */ }
    const ch = c?.data?.price_change_percentage_24h?.usd;
    return { symbol: String(c.symbol ?? '').toUpperCase(), name: String(c.name ?? ''), rank: c.market_cap_rank ?? null, changePct: typeof ch === 'number' ? ch : null, bullishPct };
  }));
  if (!out.length) throw new Error('CoinGecko trending vacío');
  return out;
}, ['cg-trending-v1'], { revalidate: 3600 });

export async function trendingCoins() {
  try { return await trendingC(); } catch (e) { console.error('[Cripto]', String(e)); return []; }
}

const fngC = unstable_cache(async () => {
  const r = await fetch('https://api.alternative.me/fng/?limit=8', { headers: H, cache: 'no-store' });
  if (!r.ok) throw new Error(`Fear&Greed ${r.status}`);
  const d = (await r.json())?.data ?? [];
  if (!d.length) throw new Error('Fear&Greed vacío');
  return { value: Number(d[0].value), label: String(d[0].value_classification), weekAgo: d[7] ? Number(d[7].value) : null };
}, ['fng-v1'], { revalidate: 3600 });

export async function cryptoFearGreed() {
  try { return await fngC(); } catch (e) { console.error('[Cripto]', String(e)); return null; }
}

export const FNG_ES: Record<string, string> = { 'Extreme Fear': 'Pánico', Fear: 'Miedo', Neutral: 'Neutral', Greed: 'Codicia', 'Extreme Greed': 'Euforia' };
