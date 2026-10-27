import { NextResponse } from 'next/server';
import { getQuotes, search } from '@/lib/fmp';
import { marketOfSymbol } from '@/lib/markets';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json({ results: [] });
  try {
    const hits = await search(q);
    const quotes = await getQuotes(hits.map((h) => h.symbol), 60);
    const bySym = new Map(quotes.map((x) => [x.symbol, x]));
    const results = hits.map((h) => ({
      ...h,
      market: marketOfSymbol(h.symbol, h.exchange),
      price: bySym.get(h.symbol)?.price ?? null,
      changePct: bySym.get(h.symbol)?.changePct ?? null
    }));
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: 'No pudimos buscar ahora. Probá de nuevo en un rato.' }, { status: 502 });
  }
}
