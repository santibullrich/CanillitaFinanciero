import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Alta de cuenta sin mail de confirmación: el usuario se crea ya confirmado con la clave de servicio
 * y el navegador ingresa enseguida con su email y contraseña.
 */
export async function POST(req: Request) {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Las cuentas todavía no están configuradas.' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const nombre = String(b.nombre ?? '').trim().slice(0, 60);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return NextResponse.json({ error: 'Revisá el email: falta algo.' }, { status: 400 });
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: 'La contraseña tiene que tener entre 8 y 72 caracteres.' }, { status: 400 });
  if (!nombre) return NextResponse.json({ error: 'Escribí tu nombre.' }, { status: 400 });

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return NextResponse.json({ error: 'Ya existe una cuenta con ese email. Ingresá con tu contraseña.', exists: true }, { status: 409 });
    console.error('[Auth] alta:', error.message);
    return NextResponse.json({ error: 'No pudimos crear la cuenta. Probá de nuevo en un rato.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
