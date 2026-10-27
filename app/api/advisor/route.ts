import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDaily, getFx, getGrades, getPriceTarget, getQuotes, getRatios, type Quote } from '@/lib/fmp';
import { isoDaysAgo, technicals } from '@/lib/technicals';
import { aiEnabled, askJSON, askText, MODEL } from '@/lib/ai';
import { UNIVERSE, THEMES } from '@/lib/themes';
import { MARKETS, marketOfSymbol } from '@/lib/markets';

export const maxDuration = 120;

const r1 = (v: number) => Math.round(v * 10) / 10;

const RULES = `Sos el estratega de inversiones de CanillitaFinanciero, una app argentina para gente común. Hablá en español rioplatense con voseo, claro y directo. Si usás un término técnico (RSI, P/E, media móvil), explicalo en pocas palabras la primera vez. Sin markdown ni emojis.
No describas la cartera: el usuario ya la ve. Tu trabajo es encontrar sus debilidades y proponer cómo rotarla.
Usá SOLO los datos que te paso: fundamentos (P/E, consenso de analistas, potencial al precio objetivo, dividendo) y análisis técnico (rendimiento 1 mes y 1 año, distancia al máximo y mínimo anual, si está sobre sus medias de 50 y 200 días, RSI de 14 días: más de 70 = sobrecomprada, menos de 30 = sobrevendida; volatilidad anual). Citá los números. Solo podés proponer tickers que estén en "universo".`;

const SHAPE = `Formato JSON:
{"debilidades":[{"titulo":"frase corta","detalle":"1 o 2 frases con números"}],
 "rotaciones":{
  "conservadora":{"idea":"1 frase con la lógica","movimientos":[{"accion":"reducir|vender|sumar|mantener","ticker":"XXX","porcentaje":10,"fundamentos":"máx. 25 palabras con números","tecnico":"máx. 25 palabras con números"}]},
  "moderada":{"idea":"...","movimientos":[...]},
  "arriesgada":{"idea":"...","movimientos":[...]}},
 "ojo":"una frase recordando que son ideas para evaluar, no órdenes, y que el análisis técnico no predice el futuro"}
Reglas: entre 2 y 4 debilidades. Cada rotación con 2 a 4 movimientos; "porcentaje" es el % del valor total de la cartera que se mueve; lo que se reduce o vende va a lo que se suma. Conservadora: baja volatilidad, dividendos, P/E bajo, consenso fuerte, menos cripto. Moderada: equilibrio entre valor y crecimiento, diversificar país y rubro. Arriesgada: crecimiento y tendencia alcista (IA, cuántica, espacio, cripto), aceptando más volatilidad.`;

async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ingresá para usar el asesor.' }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ error: 'El asesor todavía no está configurado (falta ANTHROPIC_API_KEY).' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const question: string = typeof body.question === 'string' ? body.question.slice(0, 500) : '';

  const admin = supabaseAdmin();
  if (admin) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin.from('advisor_runs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
    if ((count ?? 0) >= 2) return NextResponse.json({ error: 'Hiciste muchas consultas seguidas. Esperá un minuto.' }, { status: 429 });
  }

  const [{ data: positions }, { data: watch }] = await Promise.all([
    sb.from('positions').select('symbol,name,currency,quantity,buy_price'),
    sb.from('watchlist').select('symbol')
  ]);
  if (!positions?.length) return NextResponse.json({ error: 'Cargá al menos una posición para que el asesor tenga algo que mirar.' }, { status: 400 });

  const held = positions.map((p: any) => p.symbol as string);
  const symbols = Array.from(new Set([...held, ...(watch ?? []).map((w: any) => w.symbol as string), ...UNIVERSE])).slice(0, 80);

  const [quotes, fx] = await Promise.all([getQuotes(symbols, 60), getFx()]);
  const q = new Map<string, Quote>(quotes.map((x) => [x.symbol, x]));

  const universe = await inBatches(symbols.filter((s) => q.has(s)), 8, async (s) => {
    const quote = q.get(s)!;
    const crypto = marketOfSymbol(s, quote.exchange) === 'cr';
    const [daily, ratios, target, grades] = await Promise.all([
      getDaily(s, isoDaysAgo(370)),
      crypto ? Promise.resolve(null) : getRatios(s),
      crypto ? Promise.resolve(null) : getPriceTarget(s),
      crypto ? Promise.resolve(null) : getGrades(s)
    ]);
    const t = technicals(daily, quote.price);
    const totalG = grades ? grades.strongBuy + grades.buy + grades.hold + grades.sell + grades.strongSell : 0;
    const market = MARKETS.find((m) => m.id === marketOfSymbol(s, quote.exchange));
    return {
      ticker: s,
      nombre: quote.name,
      mercado: market?.name ?? '',
      temas: THEMES.filter((th) => th.symbols.includes(s)).map((th) => th.name),
      fundamentos: crypto
        ? { tipo: 'cripto', valor_mercado_usd_mil_millones: quote.marketCap ? Math.round(quote.marketCap / 1e9) : null }
        : {
            pe: ratios?.pe != null ? r1(ratios.pe) : null,
            dividendo_anual_pct: ratios?.dividendYield != null ? r1(ratios.dividendYield) : null,
            analistas_compran_pct: totalG ? Math.round(((grades!.strongBuy + grades!.buy) / totalG) * 100) : null,
            analistas_cantidad: totalG || null,
            potencial_precio_objetivo_pct: target?.consensus && quote.price ? Math.round((target.consensus / quote.price - 1) * 100) : null
          },
      tecnico: {
        rend_1m_pct: t.ret1m, rend_1a_pct: t.ret1y, dist_max_1a_pct: t.distHigh1y, dist_min_1a_pct: t.distLow1y,
        sobre_media_50d: t.aboveSma50, sobre_media_200d: t.aboveSma200, rsi_14: t.rsi14, volatilidad_anual_pct: t.volAnnual
      }
    };
  });

  let total = 0;
  const rows = positions.map((p: any) => {
    const quote = q.get(p.symbol);
    const rate = fx[p.currency] ?? 1;
    const value = quote ? Number(p.quantity) * quote.price * rate : 0;
    const cost = Number(p.quantity) * Number(p.buy_price) * rate;
    total += value;
    return { ticker: p.symbol, nombre: quote?.name ?? p.name, value, cost };
  });
  const cartera = {
    valor_total_usd: Math.round(total),
    posiciones: rows.map((r) => ({ ticker: r.ticker, nombre: r.nombre, peso_pct: total ? r1((r.value / total) * 100) : 0, ganancia_pct: r.cost ? r1((r.value / r.cost - 1) * 100) : 0 }))
  };
  const data = `Datos (JSON):\n${JSON.stringify({ cartera, universo: universe })}`;

  try {
    let result: any;
    if (question) {
      const text = await askText(`${RULES}\n${data}\n\nPregunta del usuario: ${question}\n\nRespondé en hasta 150 palabras, en texto plano, con números de los datos. Si conviene, sugerí movimientos concretos con su motivo fundamental y técnico. Terminá con una línea que empiece con "Ojo:" recordando que son ideas para evaluar, no órdenes.`, { model: MODEL, maxTokens: 900 });
      result = { text };
    } else {
      result = await askJSON(`${RULES}\n${data}\n\n${SHAPE}`, { model: MODEL, maxTokens: 2500 });
      if (!result?.rotaciones) throw new Error('formato');
    }
    if (admin) await admin.from('advisor_runs').insert({ user_id: user.id });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'El asesor no pudo responder. Probá de nuevo.' }, { status: 502 });
  }
}
