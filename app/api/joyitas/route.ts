import { NextResponse } from 'next/server';
import { joyitaCandidates } from '@/lib/joyitas';
import { getProfile, getRatios } from '@/lib/yahoo';
import { sectorEs } from '@/lib/sectors';
import { aiEnabled, askJSON, MODEL } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;

export type Pick = { ticker: string; nombre: string; perfil: 'conservadora' | 'moderada' | 'arriesgada'; titulo: string; tesis: string; barata: string; riesgo: string };
type Body = { v: 1; intro: string; picks: Pick[]; source: string };

/**
 * "La selección de Claude": de las candidatas que los analistas de Wall Street recomiendan
 * (o ven subvaluadas), Claude elige 6 cruzando analistas, fundamentos, técnico y redes.
 * Se arma una vez por día y queda guardada.
 */
export async function GET() {
  const day = new Date().toISOString().slice(0, 10);
  const admin = supabaseAdmin();
  if (admin) {
    const { data } = await admin.from('ai_explanations').select('body').eq('symbol', '__JOYITAS__').eq('day', day).maybeSingle();
    if ((data?.body as Body | undefined)?.v === 1) return NextResponse.json(data!.body);
  }
  if (!aiEnabled()) return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY' }, { status: 503 });

  const { rows, source } = await joyitaCandidates();
  if (!rows.length) return NextResponse.json({ error: 'Sin candidatas por ahora' }, { status: 503 });
  const top = [...rows.filter((r) => r.group === 'fuerte').slice(0, 8), ...rows.filter((r) => r.group === 'castigada').slice(0, 8)];
  const enriched = await Promise.all(top.map(async (c) => {
    const [ratios, prof] = await Promise.all([getRatios(c.symbol).catch(() => null), getProfile(c.symbol).catch(() => null)]);
    return {
      ticker: c.symbol, nombre: c.name, grupo: c.group === 'fuerte' ? 'consenso fuerte' : 'castigada pero recomendada',
      rubro: prof?.sector ? sectorEs(prof.sector) : null, beta: prof?.beta ?? null,
      analistas: { cantidad: c.analysts, dicen_comprar_pct: c.buyPct, potencial_al_precio_objetivo_pct: c.upside, mejoras_menos_bajas_30d: c.momentum },
      fundamentos: { pe: ratios?.pe != null ? Math.round(ratios.pe * 10) / 10 : null, dividendo_pct: ratios?.dividendYield != null ? Math.round(ratios.dividendYield * 10) / 10 : null },
      tecnico: { distancia_al_maximo_anual_pct: c.off52wHigh, rendimiento_1_anio_pct: c.ret1y, sobre_media_200_dias: c.above200, volatilidad_pct: c.volatility },
      redes: { puntaje_sentimiento_7d: c.social }
    };
  }));

  const prompt = `Sos el analista de CanillitaFinanciero, una app argentina que explica la bolsa a gente común. Armá la sección "Joyitas": oportunidades interesantes según los analistas de Wall Street.
Tenés candidatas de dos grupos: "consenso fuerte" (muchos analistas recomiendan comprar y ven potencial) y "castigada pero recomendada" (cayó 25% o más desde su máximo del año, pero los analistas la siguen recomendando y ven mucho potencial: posibles subvaluadas).

Elegí 6 en total, mezclando los dos grupos, y asignales un perfil:
- conservadora: empresa grande y estable (beta baja, volatilidad baja, P/E razonable o dividendo).
- moderada: equilibrio entre potencial y riesgo.
- arriesgada: mucho potencial pero más volátil o castigada.
Que haya al menos una de cada perfil. Diversificá rubros.

Cómo leer los datos: P/E = cuántos años de ganancias paga el precio (más bajo = más barata). Puntaje de sentimiento en redes: más de +5 = la gente habla bien, menos de -5 = habla mal. Si un dato es null, no existe: no lo menciones ni lo inventes.

Reglas: español rioplatense con voseo, frases cortas, sin jerga (si usás P/E o media móvil, explicalo en pocas palabras). Citá números. No digas "comprá": son ideas para investigar.

Candidatas (JSON):
${JSON.stringify(enriched)}

Formato JSON:
{"intro":"2 frases sobre qué tienen en común las elegidas hoy","picks":[{"ticker":"XXX","perfil":"conservadora|moderada|arriesgada","titulo":"máx. 7 palabras","tesis":"por qué es interesante, 2 frases con números","barata":"1 frase: por qué podría estar barata o qué potencial ven los analistas","riesgo":"1 frase: el principal riesgo"}]}`;

  try {
    const out = await askJSON<{ intro: string; picks: Omit<Pick, 'nombre'>[] }>(prompt, { model: MODEL, maxTokens: 2200 });
    const names = new Map(top.map((c) => [c.symbol, c.name]));
    const picks: Pick[] = (out.picks ?? []).filter((p) => names.has(p.ticker)).slice(0, 6).map((p) => ({ ...p, nombre: names.get(p.ticker)!, perfil: (['conservadora', 'moderada', 'arriesgada'].includes(p.perfil) ? p.perfil : 'moderada') as Pick['perfil'] }));
    if (!picks.length) throw new Error('sin elegidas');
    const body: Body = { v: 1, intro: String(out.intro ?? ''), picks, source };
    if (admin) await admin.from('ai_explanations').upsert({ symbol: '__JOYITAS__', day, body });
    return NextResponse.json(body);
  } catch (e: any) {
    console.error('[IA] joyitas:', String(e?.message ?? e).slice(0, 200));
    return NextResponse.json({ error: 'La IA no pudo armar la selección ahora.' }, { status: 502 });
  }
}
