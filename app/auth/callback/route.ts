import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Vuelta del link de confirmación de email o del login con Google. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/cartera';
  if (code) {
    const sb = supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/cartera', url.origin));
  }
  return NextResponse.redirect(new URL('/ingresar?error=link', url.origin));
}
