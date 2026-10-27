import 'server-only';
import { fetchQuotes, getCryptoTop, getDaily, getFx, getGrades, getIntraday, getNews, getProfile, search, getDayMovers, getMarketCaps, lastError } from './yahoo';
import { supabaseAdmin } from './supabase/admin';
import { finnhubError, fhRatios } from './finnhub';
import { googleEnabled } from './authProviders';
import { isoDaysAgo } from './technicals';

export type Check = { name: string; ok: boolean; detail: string; fix?: string };

const ENV: [string, string][] = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'Usuarios y base de datos'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Usuarios y base de datos'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Caché de explicaciones y límite del asesor'],
  ['ANTHROPIC_API_KEY', 'Explicaciones y asesor con IA'],
  ['FINNHUB_API_KEY', 'Ficha de empresa, ratios y analistas (Finnhub)'],
  ['NEXT_PUBLIC_LOGO_DEV_TOKEN', 'Logos'],
  ['NEXT_PUBLIC_SITE_URL', 'Links de confirmación de email (por ejemplo https://canillitafinanciero.vercel.app)']
];

const FIX = 'La fuente no respondió desde Vercel. Pasale esta página a Claude para cambiar de fuente o esperá unos minutos y recargá.';
async function check(name: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<Check> {
  try { const r = await fn(); return r.ok ? { name, ...r } : { name, ...r, fix: FIX }; }
  catch (e: any) { return { name, ok: false, detail: String(e?.message ?? e).slice(0, 220), fix: FIX }; }
}
const count = (n: number, what = 'resultados') => ({ ok: n > 0, detail: n > 0 ? `${n} ${what}` : 'Sin datos' });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
/** Prueba cruda de una dirección: código de respuesta y el comienzo del contenido. */
async function probe(name: string, url: string): Promise<Check> {
  const t0 = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,text/csv,*/*' }, cache: 'no-store', signal: ctl.signal });
    clearTimeout(timer);
    const body = (await r.text()).replace(/\s+/g, ' ').slice(0, 140);
    return { name, ok: r.ok && body.length > 20 && !/too many|error|invalid|unauthor/i.test(body.slice(0, 60)), detail: `${r.status} · ${Date.now() - t0} ms · ${body}` };
  } catch (e: any) {
    return { name, ok: false, detail: `Sin respuesta · ${String(e?.message ?? e).slice(0, 120)}` };
  }
}

export async function runChecks() {
  const env: Check[] = ENV.map(([k, what]) => {
    const ok = !!process.env[k]?.trim();
    return { name: k, ok, detail: ok ? `Cargada · ${what}` : `Falta · ${what}`, fix: ok ? undefined : 'Agregala en Vercel → Settings → Environment Variables y volvé a publicar (Redeploy).' };
  });

  const data: Check[] = await Promise.all([
    check('Cotización (AAPL)', async () => { const q = await fetchQuotes(['AAPL']); return q[0] ? { ok: true, detail: `US$ ${q[0].price} · ${q[0].changePct.toFixed(2)}% hoy` } : count(0); }),
    check('Acciones de varias bolsas', async () => count((await fetchQuotes(['GGAL.BA', '7203.T', 'PETR4.SA', 'SAP.DE', 'SHEL.L'])).length, 'de 5 cotizaciones')),
    check('Índices (S&P 500, Merval)', async () => count((await fetchQuotes(['^GSPC', '^MERV'])).length, 'de 2 índices')),
    check('Cripto (CoinGecko)', async () => count((await getCryptoTop()).length, 'monedas')),
    check('Buscador', async () => count((await search('galicia')).length)),
    check('Más suben hoy (EE.UU.)', async () => count((await getDayMovers('day_gainers')).length)),
    check('Valor de mercado de acciones', async () => count(Object.keys(await getMarketCaps(['AAPL', 'MSFT'])).length, 'de 2')),
    check('Ficha de empresa y analistas', async () => { const p = await getProfile('AAPL'); const g = await getGrades('AAPL'); return { ok: !!p?.sector && !!g, detail: p?.sector ? `${p.sector}${g ? ` · ${g.strongBuy + g.buy} analistas dicen comprar` : ''}` : 'Sin datos' }; }),
    check('Ratios: P/E y dividendo (KO)', async () => { const r = await fhRatios('KO'); return { ok: !!r, detail: r ? `P/E ${r.pe?.toFixed(1) ?? '–'} · dividendo ${r.dividendYield?.toFixed(1) ?? '–'}%` : 'Sin datos' }; }),
    check('Noticias', async () => count((await getNews('AAPL', 3)).length)),
    check('Gráfico del día', async () => count((await getIntraday('AAPL', '5min', isoDaysAgo(5))).length, 'puntos')),
    check('Histórico diario', async () => count((await getDaily('AAPL', isoDaysAgo(40))).length, 'días')),
    check('Tipos de cambio', async () => { const fx = await getFx(); const n = Object.keys(fx).length - 1; return { ok: n > 5, detail: fx.ARS ? `${n} monedas · 1 US$ = ${(1 / fx.ARS).toFixed(0)} pesos` : `${n} monedas` }; })
  ]);
  if (finnhubError) data.push({ name: 'Último aviso de Finnhub', ok: false, detail: finnhubError, fix: 'Revisá FINNHUB_API_KEY en Vercel. Un 403 en un dato puntual (como el precio objetivo) significa que no entra en el plan gratis.' });
  if (lastError) data.push({ name: 'Último error', ok: false, detail: `${lastError.where}: ${lastError.message}`, fix: FIX });

  // Pruebas crudas de cada fuente gratis posible, para elegir la que funciona desde Vercel.
  const sources: Check[] = await Promise.all([
    probe('Yahoo · precios en lote (spark)', 'https://query1.finance.yahoo.com/v7/finance/spark?symbols=AAPL,MSFT,GGAL.BA&range=1d&interval=1d'),
    probe('Yahoo · gráfico (chart)', 'https://query2.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=5m'),
    probe('Yahoo · buscador', 'https://query1.finance.yahoo.com/v1/finance/search?q=galicia&quotesCount=3&newsCount=0'),
    probe('Yahoo · listas del día', 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=3'),
    probe('Yahoo · cotización completa (pide permiso)', 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL'),
    probe('CoinGecko · cripto', 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'),
    probe('Stooq · precios (CSV)', 'https://stooq.com/q/l/?s=aapl.us,msft.us&f=sd2t2ohlcvn&h&e=csv'),
    probe('data912 · acciones argentinas', 'https://data912.com/live/arg_stocks')
  ]);

  const db: Check[] = [];
  const admin = supabaseAdmin();
  if (!admin) db.push({ name: 'Base de datos', ok: false, detail: 'Sin conexión (faltan variables de Supabase)', fix: 'Cargá NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.' });
  else {
    for (const t of ['positions', 'watchlist', 'ai_explanations', 'advisor_runs']) {
      const { error } = await admin.from(t).select('*', { count: 'exact', head: true });
      db.push(error ? { name: `Tabla ${t}`, ok: false, detail: error.message, fix: 'Ejecutá supabase/schema.sql en Supabase → SQL Editor.' } : { name: `Tabla ${t}`, ok: true, detail: 'Existe' });
    }
  }
  const g = await googleEnabled();
  db.push(g ? { name: 'Ingreso con Google', ok: true, detail: 'Activado en Supabase' } : { name: 'Ingreso con Google', ok: false, detail: 'Desactivado: el botón no se muestra', fix: 'Creá un cliente OAuth en Google Cloud y activá Google en Supabase → Authentication → Sign In / Providers (pasos en el README).' });
  const all = [...env, ...data, ...db];
  return { at: new Date().toISOString(), ok: all.every((c) => c.ok), env, data, sources, db };
}
