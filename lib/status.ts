import 'server-only';
import { fmpRaw } from './fmp';
import { supabaseAdmin } from './supabase/admin';

export type Check = { name: string; ok: boolean; detail: string; fix?: string };

const ENV: [string, string][] = [
  ['FMP_API_KEY', 'Precios y datos de mercado'],
  ['NEXT_PUBLIC_SUPABASE_URL', 'Usuarios y base de datos'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Usuarios y base de datos'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Caché de explicaciones y límite del asesor'],
  ['ANTHROPIC_API_KEY', 'Explicaciones y asesor con IA'],
  ['NEXT_PUBLIC_LOGO_DEV_TOKEN', 'Logos'],
  ['NEXT_PUBLIC_SITE_URL', 'Links de confirmación de email']
];

const TESTS: [string, string, Record<string, string | number | boolean>, string[]][] = [
  ['Cotización (AAPL)', '/quote', { symbol: 'AAPL' }, ['price', 'changePercentage', 'marketCap', 'previousClose']],
  ['Cotizaciones en lote', '/batch-quote', { symbols: 'AAPL,MSFT,GGAL' }, ['symbol', 'price']],
  ['Índices (S&P 500 y Merval)', '/batch-quote', { symbols: '^GSPC,^MERV' }, ['symbol', 'price']],
  ['Bolsa entera: Buenos Aires', '/batch-exchange-quote', { exchange: 'BUE', short: false }, ['symbol', 'price', 'marketCap']],
  ['Bolsa entera: Tokio', '/batch-exchange-quote', { exchange: 'JPX', short: false }, ['symbol', 'price', 'marketCap']],
  ['Cripto', '/batch-crypto-quotes', { short: false }, ['symbol', 'price', 'marketCap']],
  ['Buscador', '/search-name', { query: 'galicia', limit: 3 }, ['symbol', 'name']],
  ['Perfil de empresa', '/profile', { symbol: 'AAPL' }, ['companyName', 'sector', 'beta']],
  ['Analistas', '/grades-consensus', { symbol: 'AAPL' }, ['buy', 'hold', 'sell']],
  ['Precio objetivo', '/price-target-consensus', { symbol: 'AAPL' }, ['targetConsensus']],
  ['Ratios (P/E)', '/ratios-ttm', { symbol: 'AAPL' }, ['priceToEarningsRatioTTM']],
  ['Noticias', '/news/stock', { symbols: 'AAPL', limit: 2 }, ['title', 'url']],
  ['Gráfico del día', '/historical-chart/5min', { symbol: 'AAPL' }, ['date', 'close']],
  ['Histórico diario', '/historical-price-eod/light', { symbol: 'AAPL', from: '2026-01-01' }, ['date', 'price']],
  ['Screener por rubro', '/company-screener', { exchange: 'NASDAQ', sector: 'Technology', limit: 5 }, ['symbol']]
];

function fixFor(msg: string, status: number) {
  if (/invalid api key|api key|unauthor/i.test(msg) || status === 401) return 'La clave de FMP no es válida. Copiala de nuevo desde tu cuenta de FMP, cargala en Vercel como FMP_API_KEY y volvé a publicar (Redeploy).';
  if (/premium|subscription|upgrade|plan|exclusive|restricted|not available/i.test(msg) || status === 402 || status === 403) return 'Tu plan de FMP no incluye este dato. Para bolsas de todo el mundo hace falta un plan con cobertura global.';
  if (/limit reach|too many/i.test(msg) || status === 429) return 'Se agotó el cupo de llamadas de FMP. Esperá un rato o subí de plan.';
  if (/Falta la variable/.test(msg)) return 'Cargá FMP_API_KEY en Vercel → Settings → Environment Variables y volvé a publicar (Redeploy).';
  return 'Revisá el mensaje. Si FMP cambió el nombre de un endpoint o campo, se corrige en lib/fmp.ts.';
}

export async function runChecks() {
  const env: Check[] = ENV.map(([k, what]) => {
    const ok = !!process.env[k]?.trim();
    return { name: k, ok, detail: ok ? `Cargada · ${what}` : `Falta · ${what}`, fix: ok ? undefined : 'Agregala en Vercel → Settings → Environment Variables y volvé a publicar (Redeploy).' };
  });
  const lk = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN?.trim();
  if (lk && lk.startsWith('sk_')) env.push({ name: 'NEXT_PUBLIC_LOGO_DEV_TOKEN', ok: false, detail: 'Es la clave secreta de logo.dev', fix: 'Usá la clave pública (empieza con pk_). La secreta nunca va con NEXT_PUBLIC_.' });

  const fmp: Check[] = await Promise.all(TESTS.map(async ([name, path, params, fields]) => {
    try {
      const data = await fmpRaw<any>(path, params, 0);
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      if (!rows.length) return { name, ok: false, detail: 'Respondió sin datos', fix: 'Puede ser el plan de FMP o un símbolo que no reconoce.' };
      const missing = fields.filter((f) => !(f in rows[0]));
      if (missing.length) return { name, ok: false, detail: `Faltan campos: ${missing.join(', ')}`, fix: 'FMP usa otros nombres de campo. Pasame este mensaje y lo ajusto en lib/fmp.ts.' };
      return { name, ok: true, detail: `${rows.length} ${rows.length === 1 ? 'resultado' : 'resultados'}` };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      return { name, ok: false, detail: msg.slice(0, 220), fix: fixFor(msg, Number(e?.status) || 0) };
    }
  }));

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
  const all = [...env, ...fmp, ...db];
  return { at: new Date().toISOString(), ok: all.every((c) => c.ok), env, fmp, db };
}
