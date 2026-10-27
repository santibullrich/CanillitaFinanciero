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
    if (!error) return NextResponse.redirect(new URL(next.startsWith('/') && !next.startsWith('//') ? next : '/cartera', url.origin));
    console.error('[Auth] callback:', error.message);
  }
  if (url.searchParams.get('error')) console.error('[Auth] callback:', url.searchParams.get('error_description'));
  return NextResponse.redirect(new URL(`/ingresar?error=${code || url.searchParams.get('error') ? 'google' : 'link'}`, url.origin));
}
