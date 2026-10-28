import { NextResponse } from 'next/server';
import { growthOf } from '@/lib/assetRates';

export const maxDuration = 30;

/** Crecimiento anual histórico (en dólares) de cualquier acción, ETF o cripto, para el simulador. */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get('symbol')?.trim().toUpperCase() ?? '';
  if (!/^[A-Z0-9.^=\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: 'Símbolo inválido.' }, { status: 400 });
  const a = await growthOf(symbol);
  if (!a) return NextResponse.json({ error: 'No encontramos suficiente historia de precios para ese activo.' }, { status: 404 });
  return NextResponse.json(a, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } });
}
