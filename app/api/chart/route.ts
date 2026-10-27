import { NextResponse } from 'next/server';
import { getDaily, getIntraday } from '@/lib/yahoo';
import { isoDaysAgo } from '@/lib/technicals';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get('symbol') ?? '';
  const range = sp.get('range') ?? '1D';
  if (!symbol) return NextResponse.json({ points: [] }, { status: 400 });
  try {
    let points;
    if (range === '1D') {
      const all = await getIntraday(symbol, '5min', isoDaysAgo(5));
      const lastDay = all.length ? all[all.length - 1].t.slice(0, 10) : '';
      points = all.filter((p) => p.t.startsWith(lastDay));
    } else if (range === '1S') points = await getIntraday(symbol, '1hour', isoDaysAgo(8));
    else if (range === '1M') points = await getDaily(symbol, isoDaysAgo(32));
    else points = await getDaily(symbol, isoDaysAgo(366));
    return NextResponse.json({ points }, { headers: { 'Cache-Control': `s-maxage=${range === '1D' ? 60 : 1800}, stale-while-revalidate=600` } });
  } catch {
    return NextResponse.json({ points: [], error: 'Sin gráfico por ahora' }, { status: 502 });
  }
}
