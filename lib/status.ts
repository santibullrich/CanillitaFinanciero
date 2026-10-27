import 'server-only';
import { fetchQuotes, getDaily, getFx, getGrades, getIntraday, getNews, getPriceTarget, getProfile, getRatios, search, getDayMovers, lastError } from './yahoo';
import { supabaseAdmin } from './supabase/admin';
import { isoDaysAgo } from './technicals';

export type Check = { name: string; ok: boolean; detail: string; fix?: string };

const ENV: [string, string][] = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'Usuarios y base de datos'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Usuarios y base de datos'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Caché de explicaciones y límite del asesor'],
  ['ANTHROPIC_API_KEY', 'Explicaciones y asesor con IA'],
  ['NEXT_PUBLIC_LOGO_DEV_TOKEN', 'Logos'],
  ['NEXT_PUBLIC_SITE_URL', 'Links de confirmación de email']
];

const YAHOO_FIX = 'Yahoo no respondió. Suele ser un bloqueo temporal desde los servidores de Vercel: esperá unos minutos y recargá. Si sigue, revisá los logs de Vercel (buscá "[Yahoo]").';

async function check(name: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<Check> {
  try {
    const r = await fn();
    return r.ok ? { name, ...r } : { name, ...r, fix: YAHOO_FIX };
  } catch (e: any) {
    return { name, ok: false, detail: String(e?.message ?? e).slice(0, 220), fix: YAHOO_FIX };
  }
}
const count = (n: number, what = 'resultados') => ({ ok: n > 0, detail: n > 0 ? `${n} ${what}` : 'Sin datos' });

export async function runChecks() {
  const env: Check[] = ENV.map(([k, what]) => {
    const ok = !!process.env[k]?.trim();
    return { name: k, ok, detail: ok ? `Cargada · ${what}` : `Falta · ${what}`, fix: ok ? undefined : 'Agregala en Vercel → Settings → Environment Variables y volvé a publicar (Redeploy).' };
  });
  const lk = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN?.trim();
  if (lk && lk.startsWith('sk_')) env.push({ name: 'NEXT_PUBLIC_LOGO_DEV_TOKEN', ok: false, detail: 'Es la clave secreta de logo.dev', fix: 'Usá la clave pública (empieza con pk_).' });

  const data: Check[] = await Promise.all([
    check('Cotización (AAPL)', async () => { const q = await fetchQuotes(['AAPL']); return q[0] ? { ok: true, detail: `US$ ${q[0].price} · ${q[0].changePct.toFixed(2)}% hoy` } : count(0); }),
    check('Acciones de varias bolsas', async () => count((await fetchQuotes(['GGAL.BA', '7203.T', 'PETR4.SA', 'SAP.DE', 'SHEL.L'])).length, 'de 5 cotizaciones')),
    check('Índices (S&P 500, Merval)', async () => count((await fetchQuotes(['^GSPC', '^MERV'])).length, 'de 2 índices')),
    check('Cripto (Bitcoin)', async () => count((await fetchQuotes(['BTC-USD'])).length)),
    check('Buscador', async () => count((await search('galicia')).length)),
    check('Más suben hoy (EE.UU.)', async () => count((await getDayMovers('day_gainers')).length)),
    check('Perfil de empresa', async () => { const p = await getProfile('AAPL'); return p ? { ok: !!p.sector, detail: p.sector ? `${p.name} · ${p.sector}` : 'Sin rubro' } : count(0); }),
    check('Analistas', async () => { const g = await getGrades('AAPL'); return g ? { ok: true, detail: `${g.strongBuy + g.buy} dicen comprar` } : count(0); }),
    check('Precio objetivo', async () => { const t = await getPriceTarget('AAPL'); return t?.consensus ? { ok: true, detail: `US$ ${t.consensus}` } : count(0); }),
    check('Ratios (P/E)', async () => { const r = await getRatios('AAPL'); return r?.pe ? { ok: true, detail: `P/E ${r.pe.toFixed(1)}` } : count(0); }),
    check('Noticias', async () => count((await getNews('AAPL', 3)).length)),
    check('Gráfico del día', async () => count((await getIntraday('AAPL', '5min', isoDaysAgo(5))).length, 'puntos')),
    check('Histórico diario', async () => count((await getDaily('AAPL', isoDaysAgo(40))).length, 'días')),
    check('Tipos de cambio', async () => { const fx = await getFx(); const n = Object.keys(fx).length - 1; return { ok: n > 5, detail: fx.ARS ? `${n} monedas · 1 US$ = ${(1 / fx.ARS).toFixed(0)} pesos` : `${n} monedas` }; })
  ]);
  if (lastError) data.push({ name: 'Último error de Yahoo', ok: false, detail: `${lastError.where}: ${lastError.message}`, fix: YAHOO_FIX });

  const db: Check[] = [];
  const admin = supabaseAdmin();
  if (!admin) db.push({ name: 'Base de datos', ok: false, detail: 'Sin conexión (faltan variables de Supabase)', fix: 'Cargá NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.' });
  else {
    for (const t of ['positions', 'watchlist', 'ai_explanations', 'advisor_runs']) {
      const { error } = await admin.from(t).select('*', { count: 'exact', head: true });
      db.push(error
        ? { name: `Tabla ${t}`, ok: false, detail: error.message, fix: 'Ejecutá supabase/schema.sql en Supabase → SQL Editor.' }
        : { name: `Tabla ${t}`, ok: true, detail: 'Existe' });
    }
  }
  const all = [...env, ...data, ...db];
  return { at: new Date().toISOString(), ok: all.every((c) => c.ok), env, data, db };
}
