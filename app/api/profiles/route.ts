import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/fmp';
import { marketOfSymbol } from '@/lib/markets';
import { riskLevel, sectorEs } from '@/lib/sectors';

/** Rubro y nivel de riesgo de cada activo (para repartir la cartera). */
export async function GET(req: Request) {
  const symbols = (new URL(req.url).searchParams.get('symbols') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
  const out: Record<string, { sector: string; risk: string; crypto: boolean }> = {};
  await Promise.all(symbols.map(async (s) => {
    const p = await getProfile(s).catch(() => null);
    const crypto = marketOfSymbol(s, p?.exchange) === 'cr';
    out[s] = { sector: crypto ? 'Cripto' : sectorEs(p?.sector), risk: riskLevel(p?.beta, crypto), crypto };
  }));
  return NextResponse.json(out, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=86400' } });
}
