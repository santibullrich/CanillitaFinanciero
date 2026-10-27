import { NextResponse } from 'next/server';
import { getFx, getQuotes } from '@/lib/yahoo';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const symbols = (sp.get('symbols') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 300);
  try {
    const [quotes, fx] = await Promise.all([symbols.length ? getQuotes(symbols, 15) : Promise.resolve([]), sp.get('fx') ? getFx() : Promise.resolve(null)]);
    return NextResponse.json({ quotes, fx, at: Date.now() }, { headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=30' } });
  } catch {
    return NextResponse.json({ quotes: [], fx: null, error: 'Sin datos por ahora' }, { status: 502 });
  }
}
