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

export default function AuthForm({ next = '/cartera', initialError, google: withGoogle = false }: { next?: string; initialError?: string; google?: boolean }) {
  const [tab, setTab] = useState<'crear' | 'ingresar'>('crear');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const safeNext = next.startsWith('/') ? next : '/cartera';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (tab === 'crear' && !nombre.trim()) return setErr('Escribí tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Revisá el email: falta algo.');
    if (tab === 'crear' && pass.length < 8) return setErr('La contraseña tiene que tener al menos 8 caracteres.');
    if (!pass) return setErr('Escribí tu contraseña.');
    setBusy(true);
    const sb = supabaseBrowser();
    if (tab === 'crear') {
      const r = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass, nombre: nombre.trim() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setBusy(false); if (j.exists) setTab('ingresar'); return setErr(j.error ?? 'No pudimos crear la cuenta. Probá de nuevo en un rato.'); }
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      setBusy(false);
      if (error) return setErr(friendly(error.message));
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
    if (error) setErr('No pudimos abrir Google. Probá de nuevo o usá tu email.');
  };

  return (
    <div className="panel authbox">
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
      {withGoogle && <button className="pl-btn quiet" type="button" onClick={google} style={{ width: '100%', justifyContent: 'center', gap: 10 }}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8C3.9 20.6 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>Seguir con Google</button>}
    </div>
  );
}
