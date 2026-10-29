import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Alta de posiciones desde el servidor: valida la sesión con la cookie y guarda con la clave de servicio,
 * así no depende de las políticas de la base ni de la sesión del navegador.
 */
export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tu sesión venció. Volvé a ingresar.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const symbol = String(b.symbol ?? '').trim().toUpperCase().slice(0, 24);
  const name = String(b.name ?? '').slice(0, 120) || symbol;
  const currency = String(b.currency ?? 'USD').slice(0, 6) || 'USD';
  const quantity = Number(b.quantity), buy_price = Number(b.buy_price);
  if (!/^[A-Z0-9.^=\-]{1,24}$/.test(symbol)) return NextResponse.json({ error: 'Elegí una acción o cripto del buscador.' }, { status: 400 });
  if (!(quantity > 0) || !(buy_price > 0) || !isFinite(quantity) || !isFinite(buy_price)) return NextResponse.json({ error: 'Revisá la cantidad y el precio: tienen que ser mayores a cero.' }, { status: 400 });

  const db = supabaseAdmin() ?? supabaseServer();
  const { data, error } = await db.from('positions').insert({ user_id: user.id, symbol, name, currency, quantity, buy_price }).select('id').single();
  if (error) {
    console.error('[Cartera] alta:', error.code, error.message);
    const hint = error.code === '42P01' ? 'Falta la tabla de posiciones en Supabase (ejecutá supabase/schema.sql).'
      : error.code === '23503' ? 'Tu usuario no figura en la base. Cerrá sesión y volvé a ingresar.'
      : error.code === '42501' ? 'La base no deja guardar (permisos). Revisá las políticas de la tabla positions.'
      : 'No pudimos guardar la posición.';
    return NextResponse.json({ error: `${hint} (código ${error.code ?? '?'})` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tu sesión venció. Volvé a ingresar.' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const db = supabaseAdmin() ?? supabaseServer();
  const { error } = await db.from('positions').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'No pudimos borrar la posición.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
