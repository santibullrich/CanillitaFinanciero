import 'server-only';

/** Pregunta a Supabase si el ingreso con Google está activado, para mostrar el botón solo si funciona. */
export async function googleEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, next: { revalidate: 300 } });
    if (!r.ok) return false;
    const j = await r.json();
    return !!j?.external?.google;
  } catch { return false; }
}
