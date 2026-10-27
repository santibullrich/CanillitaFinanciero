import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Cliente con service role: solo en el servidor, para escribir cachés compartidas. Devuelve null si falta la clave. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
