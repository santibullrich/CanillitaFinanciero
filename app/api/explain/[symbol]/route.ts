import { NextResponse } from 'next/server';
import { getGrades, getNews, getPriceTarget, getQuote } from '@/lib/yahoo';
import { aiEnabled, askJSON, MODEL_FAST } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;

type Reason = { titulo: string; detalle: string };

export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  const day = new Date().toISOString().slice(0, 10);
  const admin = supabaseAdmin();

  if (admin) {
    const { data } = await admin.from('ai_explanations').select('body').eq('symbol', symbol).eq('day', day).maybeSingle();
    if (data?.body) return NextResponse.json(data.body);
  }

  const [quote, news, grades, target] = await Promise.all([getQuote(symbol), getNews(symbol, 8), getGrades(symbol), getPriceTarget(symbol)]);
  if (!quote) return NextResponse.json({ error: 'No encontramos ese activo.' }, { status: 404 });
  const sources = news.slice(0, 5).map((n) => ({ title: n.title, site: n.site, url: n.url }));

  if (!aiEnabled() || !news.length) {
    return NextResponse.json({ reasons: [], sources, generated: false });
  }

  try {
    const prompt = `Sos el redactor de CanillitaFinanciero, una app argentina que explica la bolsa a gente común (Don Carlos y Doña Rosa). Español rioplatense con voseo, frases cortas, sin jerga.
${quote.name} (${symbol}) ${quote.changePct >= 0 ? 'sube' : 'baja'} ${quote.changePct.toFixed(2)}% hoy.
Titulares recientes: ${JSON.stringify(news.map((n) => ({ titulo: n.title, fuente: n.site, fecha: n.date })))}
Consenso de analistas: ${JSON.stringify(grades)}. Precio objetivo: ${JSON.stringify(target)}. Precio actual: ${quote.price}.
Explicá por qué se mueve hoy en 2 o 3 motivos, usando SOLO estos datos. Si los titulares no explican el movimiento, decilo con honestidad en un motivo.
Formato JSON: {"reasons":[{"titulo":"máx. 8 palabras","detalle":"1 o 2 frases"}]}`;
    const out = await askJSON<{ reasons: Reason[] }>(prompt, { model: MODEL_FAST, maxTokens: 600 });
    const body = { reasons: (out.reasons ?? []).slice(0, 3), sources, generated: true };
    if (admin) await admin.from('ai_explanations').upsert({ symbol, day, body });
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ reasons: [], sources, generated: false });
  }
}
