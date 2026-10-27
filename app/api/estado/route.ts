import { NextResponse } from 'next/server';
import { runChecks } from '@/lib/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Diagnóstico en JSON: qué variables están cargadas y qué responde cada fuente de datos. No muestra ninguna clave. */
export async function GET() {
  return NextResponse.json(await runChecks(), { headers: { 'Cache-Control': 'no-store' } });
}
