'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const ARROW = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

function friendly(msg: string) {
  if (/invalid login/i.test(msg)) return 'El email o la contraseña no coinciden.';
  if (/already registered|already been registered/i.test(msg)) return 'Ya existe una cuenta con ese email. Ingresá con tu contraseña.';
  if (/email not confirmed/i.test(msg)) return 'Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).';
  if (/password/i.test(msg)) return 'La contraseña tiene que tener al menos 8 caracteres.';
  return 'No pudimos completar el ingreso. Probá de nuevo en un rato.';
}

export default function AuthForm({ next = '/cartera', initialError }: { next?: string; initialError?: string }) {
  const [tab, setTab] = useState<'crear' | 'ingresar'>('crear');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(initialError ?? '');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const safeNext = next.startsWith('/') ? next : '/cartera';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setInfo('');
    if (tab === 'crear' && !nombre.trim()) return setErr('Escribí tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Revisá el email: falta algo.');
    if (tab === 'crear' && pass.length < 8) return setErr('La contraseña tiene que tener al menos 8 caracteres.');
    if (!pass) return setErr('Escribí tu contraseña.');
    setBusy(true);
    const sb = supabaseBrowser();
    if (tab === 'crear') {
      const { data, error } = await sb.auth.signUp({
        email, password: pass,
        options: { data: { nombre: nombre.trim() }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` }
      });
      setBusy(false);
      if (error) return setErr(friendly(error.message));
      if (!data.session) return setInfo(`Te mandamos un mail a ${email} para confirmar tu cuenta. Tocá el link y volvés directo a tu cartera.`);
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      setBusy(false);
      if (error) return setErr(friendly(error.message));
    }
    router.push(safeNext);
    router.refresh();
  };

  const google = async () => {
    setErr('');
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` } });
    if (error) setErr('El ingreso con Google no está disponible ahora. Usá tu email.');
  };

  return (
    <div className="panel authbox">
      {info && <p className="flash">{info}</p>}
      <div className="tabs" role="tablist">
        <button role="tab" type="button" aria-selected={tab === 'crear'} onClick={() => { setTab('crear'); setErr(''); }}>Crear cuenta</button>
        <button role="tab" type="button" aria-selected={tab === 'ingresar'} onClick={() => { setTab('ingresar'); setErr(''); }}>Ingresar</button>
      </div>
      <form onSubmit={submit} noValidate>
        {tab === 'crear' && <label className="field"><span>Nombre</span><input value={nombre} onChange={(e) => { setNombre(e.target.value); setErr(''); }} autoComplete="given-name" placeholder="Rosa" /></label>}
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} autoComplete="email" placeholder="rosa@gmail.com" /></label>
        <label className="field"><span>Contraseña</span><input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr(''); }} autoComplete={tab === 'crear' ? 'new-password' : 'current-password'} placeholder={tab === 'crear' ? 'Al menos 8 caracteres' : 'Tu contraseña'} /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="pl-btn primary" type="submit" disabled={busy}>{busy ? 'Un momento…' : tab === 'crear' ? 'Crear mi cuenta' : 'Ingresar'}{ARROW}</button>
      </form>
      <button className="pl-btn quiet" type="button" onClick={google} style={{ width: '100%', justifyContent: 'center' }}>Seguir con Google</button>
    </div>
  );
}
