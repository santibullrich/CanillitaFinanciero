'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function FollowButton({ symbol, loggedIn }: { symbol: string; loggedIn: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!loggedIn) return;
    supabaseBrowser().from('watchlist').select('symbol').eq('symbol', symbol).maybeSingle().then(({ data }) => setOn(!!data));
  }, [symbol, loggedIn]);
  const toggle = async () => {
    if (!loggedIn) { router.push(`/ingresar?volver=${encodeURIComponent('/accion/' + symbol)}`); return; }
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); router.push('/ingresar'); return; }
    const { error } = on
      ? await sb.from('watchlist').delete().eq('user_id', user.id).eq('symbol', symbol)
      : await sb.from('watchlist').insert({ user_id: user.id, symbol });
    if (!error) setOn(!on);
    setBusy(false);
  };
  return <button className="follow" type="button" aria-pressed={on} disabled={busy} onClick={toggle}>{on ? 'Siguiendo' : '+ Seguir'}</button>;
}
