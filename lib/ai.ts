import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
export const MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-5-5';

function client() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? new Anthropic({ apiKey: key }) : null;
}

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY?.trim();
export let aiLastError: string | null = null;

export async function askText(prompt: string, opts: { model?: string; maxTokens?: number } = {}) {
  const c = client();
  if (!c) throw new Error('Falta ANTHROPIC_API_KEY');
  // Si el modelo pedido falla (nombre mal cargado, sin acceso), se prueba con el otro.
  const models = Array.from(new Set([opts.model ?? MODEL, MODEL, MODEL_FAST]));
  let last: any;
  for (const model of models) {
    try {
      const r = await c.messages.create({ model, max_tokens: opts.maxTokens ?? 1200, messages: [{ role: 'user', content: prompt }] });
      return r.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    } catch (e: any) {
      last = e;
      aiLastError = `${model}: ${e?.status ?? ''} ${String(e?.error?.error?.message ?? e?.message ?? e)}`.slice(0, 240);
      console.error('[IA]', aiLastError);
      // Errores de clave o de saldo no se arreglan cambiando de modelo.
      if (e?.status === 401 || /credit|billing/i.test(String(e?.message))) break;
    }
  }
  throw last;
}

/** Pide JSON y lo parsea con tolerancia (acepta texto alrededor o un bloque ```json). */
export async function askJSON<T = any>(prompt: string, opts: { model?: string; maxTokens?: number } = {}): Promise<T> {
  const text = await askText(prompt + '\n\nRespondé SOLO con el JSON, sin texto antes ni después.', opts);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(body) as T;
}
