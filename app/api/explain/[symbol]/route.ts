import { NextResponse } from 'next/server';
import { getDaily, getGrades, getNews, getPriceTarget, getProfile, getQuote, getRatios } from '@/lib/yahoo';
import { aiEnabled, askJSON, MODEL } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isoDaysAgo, technicals } from '@/lib/technicals';
import { marketById, marketOfSymbol } from '@/lib/markets';
import { sectorEs } from '@/lib/sectors';

export const maxDuration = 60;

type Motivo = { tipo: 'noticias' | 'fundamentos' | 'tecnico' | 'analistas' | 'mercado'; titulo: string; detalle: string };
type Body = { v: 2; resumen: string; motivos: Motivo[]; sources: { title: string; site: string; url: string }[]; usados: string[]; generated: boolean; changePct: number };

const pct = (v: number) => `${Math.abs(v).toFixed(1).replace('.', ',')}%`;

/** Explicación armada con reglas, para cuando la IA no responde: siempre hay algo útil que mostrar. */
function fallback(name: string, chg: number, d: any, newsTitles: string[]): { resumen: string; motivos: Motivo[] } {
  const up = chg >= 0, motivos: Motivo[] = [];
  const idx = d.mercado?.cambio_pct_hoy as number | null | undefined;
  if (idx != null) {
    const same = Math.sign(idx) === Math.sign(chg) && Math.abs(idx) >= 0.3;
    motivos.push(same
      ? { tipo: 'mercado', titulo: 'Acompaña a todo el mercado', detalle: `El ${d.mercado.indice} ${idx >= 0 ? 'sube' : 'baja'} ${pct(idx)} hoy, así que buena parte del movimiento es general.` }
      : { tipo: 'mercado', titulo: 'Va por su cuenta', detalle: `El ${d.mercado.indice} se mueve ${pct(idx)} y ${name} ${up ? 'sube' : 'baja'} ${pct(chg)}: el movimiento es propio de la empresa.` });
  }
  if (newsTitles[0]) motivos.push({ tipo: 'noticias', titulo: 'Lo que se publicó', detalle: `La noticia más reciente: “${newsTitles[0]}”.` });
  const t = d.tecnico;
  if (t?.rsi_14 != null) {
    const rsi = t.rsi_14 as number;
    const estado = rsi > 70 ? 'sobrecomprada (subió muy rápido y suele tomar aire)' : rsi < 30 ? 'sobrevendida (bajó muy rápido y a veces rebota)' : 'en zona normal';
    motivos.push({ tipo: 'tecnico', titulo: rsi > 70 ? 'Viene de subir mucho' : rsi < 30 ? 'Viene de bajar mucho' : 'Tendencia del último mes', detalle: `En el último mes ${t.rendimiento_1_mes_pct >= 0 ? 'ganó' : 'perdió'} ${pct(t.rendimiento_1_mes_pct ?? 0)}. Su RSI, que mide la velocidad de las subas y bajas, está en ${Math.round(rsi)}: ${estado}.` });
  }
  const a = d.analistas;
  if (a) motivos.push({ tipo: 'analistas', titulo: 'Qué dicen los analistas', detalle: `De ${a.cantidad} analistas, ${a.dicen_comprar} dicen comprar, ${a.dicen_mantener} mantener y ${a.dicen_vender} vender.` });
  const base = `${name} ${up ? 'sube' : 'baja'} ${pct(chg)} hoy`;
  const resumen = motivos[0]?.tipo !== 'mercado' ? `${base}.` : motivos[0].titulo.startsWith('Acompaña') ? `${base}, en línea con su mercado.` : `${base}, por motivos propios más que por el mercado.`;
  return { resumen, motivos: motivos.slice(0, 4) };
}

const r1 = (v: number | null | undefined) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);

/**
 * "¿Por qué sube o baja hoy?": Claude cruza noticias, fundamentos, análisis técnico,
 * opinión de analistas y lo que hace el mercado, y lo explica en simple.
 * Se guarda una explicación por activo y por día; se rehace si el movimiento cambió mucho.
 */
export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  const day = new Date().toISOString().slice(0, 10);
  const admin = supabaseAdmin();

  const quote = await getQuote(symbol);
  if (!quote) return NextResponse.json({ error: 'No encontramos ese activo.' }, { status: 404 });

  if (admin) {
    const { data } = await admin.from('ai_explanations').select('body').eq('symbol', symbol).eq('day', day).maybeSingle();
    const b = data?.body as Body | undefined;
    // Se reutiliza si es del formato actual y el movimiento no cambió de signo ni más de 1,5 puntos.
    if (b?.v === 2 && Math.sign(b.changePct) === Math.sign(quote.changePct) && Math.abs(b.changePct - quote.changePct) < 1.5) return NextResponse.json(b);
  }

  const mId = marketOfSymbol(symbol, quote.exchange);
  const market = marketById(mId);
  const crypto = mId === 'cr';
  const [news, grades, target, ratios, profile, daily, index] = await Promise.all([
    getNews(symbol, 8),
    crypto ? null : getGrades(symbol),
    crypto ? null : getPriceTarget(symbol),
    crypto ? null : getRatios(symbol),
    crypto ? null : getProfile(symbol),
    getDaily(symbol, isoDaysAgo(370)),
    market && market.index !== symbol ? getQuote(market.index) : Promise.resolve(null)
  ]);
  const t = technicals(daily, quote.price);
  const sources = news.slice(0, 5).map((n) => ({ title: n.title, site: n.site, url: n.url }));

  const totalG = grades ? grades.strongBuy + grades.buy + grades.hold + grades.sell + grades.strongSell : 0;
  const datos = {
    activo: { nombre: quote.name, ticker: symbol, mercado: market?.name ?? 'Otros', rubro: crypto ? 'Cripto' : profile?.sector ? sectorEs(profile.sector) : null, moneda: quote.currency },
    hoy: { cambio_pct: r1(quote.changePct), precio: quote.price, cierre_anterior: quote.previousClose, minimo_dia: quote.dayLow, maximo_dia: quote.dayHigh },
    mercado: index ? { indice: market?.indexName, cambio_pct_hoy: r1(index.changePct) } : null,
    tecnico: {
      rendimiento_1_mes_pct: t.ret1m, rendimiento_1_anio_pct: t.ret1y, distancia_al_maximo_anual_pct: t.distHigh1y, distancia_al_minimo_anual_pct: t.distLow1y,
      sobre_media_50_dias: t.aboveSma50, sobre_media_200_dias: t.aboveSma200, rsi_14: t.rsi14, volatilidad_anual_pct: t.volAnnual
    },
    fundamentos: crypto ? null : { pe: r1(ratios?.pe), dividendo_pct: r1(ratios?.dividendYield), beta: r1(profile?.beta) },
    analistas: crypto || !totalG ? null : {
      cantidad: totalG, dicen_comprar: grades!.strongBuy + grades!.buy, dicen_mantener: grades!.hold, dicen_vender: grades!.sell + grades!.strongSell,
      precio_objetivo: target?.consensus ?? null, potencial_pct: target?.consensus && quote.price ? r1((target.consensus / quote.price - 1) * 100) : null
    },
    noticias: news.map((n) => ({ titulo: n.title, fuente: n.site, fecha: n.date.slice(0, 10) }))
  };
  const usados = [
    news.length ? 'Noticias' : '',
    datos.fundamentos && (datos.fundamentos.pe != null || datos.fundamentos.dividendo_pct != null) ? 'Fundamentos' : '',
    t.rsi14 != null ? 'Análisis técnico' : '',
    datos.analistas ? 'Analistas' : '',
    datos.mercado ? 'Mercado' : ''
  ].filter(Boolean);

  const plain = () => NextResponse.json({ v: 2, ...fallback(quote.name, quote.changePct, datos, news.map((n) => n.title)), sources, usados, generated: false, changePct: quote.changePct } satisfies Body);
  if (!aiEnabled()) return plain();

  const sube = quote.changePct >= 0;
  const prompt = `Sos el analista de CanillitaFinanciero, una app argentina que explica la bolsa a gente común (pensá en Don Carlos y Doña Rosa).
${quote.name} (${symbol}) ${sube ? 'sube' : 'baja'} ${Math.abs(quote.changePct).toFixed(2)}% hoy.

Tu tarea: explicar POR QUÉ se mueve hoy, cruzando estas cinco fuentes y quedándote con las que de verdad explican el movimiento:
1. Noticias del día y de los últimos días.
2. Fundamentos (P/E, dividendo, beta).
3. Análisis técnico (tendencia de 1 mes y 1 año, medias de 50 y 200 días, RSI: más de 70 = sobrecomprada, menos de 30 = sobrevendida; cercanía a máximos o mínimos del año).
4. Opinión de los analistas (consenso y precio objetivo).
5. Lo que hace su mercado hoy (si todo el índice se mueve parecido, gran parte del movimiento es general y no de la empresa).

Reglas:
- Usá SOLO los datos de abajo. Si un dato es null, no existe: no lo menciones ni lo inventes.
- Ordená los motivos del más al menos importante. Citá números concretos.
- Si las noticias no explican el movimiento, decilo con honestidad y apoyate en el mercado y el técnico.
- Español rioplatense con voseo, frases cortas, sin jerga. Si usás un término técnico (RSI, P/E, media móvil), explicalo en pocas palabras.
- No recomiendes comprar ni vender.

Datos (JSON):
${JSON.stringify(datos)}

Formato JSON:
{"resumen":"1 o 2 frases que respondan por qué se mueve hoy","motivos":[{"tipo":"noticias|fundamentos|tecnico|analistas|mercado","titulo":"máx. 8 palabras","detalle":"1 o 2 frases con números"}]}
Entre 2 y 4 motivos.`;

  try {
    const out = await askJSON<{ resumen: string; motivos: Motivo[] }>(prompt, { model: MODEL, maxTokens: 1600 });
    const tipos = ['noticias', 'fundamentos', 'tecnico', 'analistas', 'mercado'];
    const body: Body = {
      v: 2,
      resumen: String(out.resumen ?? ''),
      motivos: (out.motivos ?? []).filter((m) => m?.titulo).slice(0, 4).map((m) => ({ ...m, tipo: (tipos.includes(m.tipo) ? m.tipo : 'mercado') as Motivo['tipo'] })),
      sources, usados, generated: true, changePct: quote.changePct
    };
    if (!body.motivos.length) throw new Error('respuesta vacía');
    if (admin) await admin.from('ai_explanations').upsert({ symbol, day, body });
    return NextResponse.json(body);
  } catch (e: any) {
    console.error(`[IA] explicación ${symbol}: ${String(e?.message ?? e).slice(0, 200)}`);
    return plain();
  }
}
