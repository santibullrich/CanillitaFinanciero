const cache: Record<number, Intl.NumberFormat> = {};
export const nf = (d = 2) => (cache[d] ??= new Intl.NumberFormat('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }));

export const SYM: Record<string, string> = { USD: 'US$', EUR: '€', JPY: '¥', HKD: 'HK$', BRL: 'R$', ARS: '$', GBP: '£', GBp: 'p', CHF: 'CHF', CNY: '¥', KRW: '₩', INR: '₹', CAD: 'C$', AUD: 'A$', MXN: 'MX$', TWD: 'NT$' };

export function fmtPrice(v: number | null | undefined, cur = 'USD') {
  if (v == null || !isFinite(v)) return '—';
  const d = cur === 'JPY' || cur === 'KRW' ? 0 : Math.abs(v) >= 1000 ? 0 : Math.abs(v) < 1 ? 4 : 2;
  if (cur === 'GBp') return `${nf(d).format(v)} p`; // Londres cotiza en peniques
  return `${SYM[cur] ?? cur} ${nf(d).format(v)}`;
}
/** Pasa un precio a dólares con los tipos de cambio del día. Null si no hay cotización de esa moneda. */
export function toUsd(v: number | null | undefined, cur: string, fx: Record<string, number>) {
  if (v == null || !isFinite(v)) return null;
  if (!cur || cur === 'USD') return v;
  const r = fx[cur];
  return r ? v * r : null;
}
/** Precio en dólares; si no hay tipo de cambio para esa moneda, queda en la moneda original. */
export function fmtUsd(v: number | null | undefined, cur: string, fx: Record<string, number>) {
  const u = toUsd(v, cur, fx);
  return u == null ? fmtPrice(v, cur) : fmtPrice(u, 'USD');
}
export const fmtPct = (c: number | null | undefined) =>
  c == null || !isFinite(c) ? '—' : (c > 0 ? '+' : c < 0 ? '−' : '') + nf(Math.abs(c) >= 10 ? 1 : 2).format(Math.abs(c)) + '%';
export const absPct = (c: number) => nf(Math.abs(c) >= 10 ? 1 : 2).format(Math.abs(c)) + '%';
export const dir = (c: number | null | undefined) => (c == null ? 'flat' : c > 0.005 ? 'up' : c < -0.005 ? 'down' : 'flat');

/** Escala que usamos en la app: millones, billones (mil millones) y trillones (mil billones). */
export function bigNum(v: number) {
  const a = Math.abs(v);
  const u = (n: number, one: string, many: string) => { const t = nf(n >= 100 ? 0 : 1).format(n); return `${t} ${t === '1,0' || t === '1' ? one : many}`; };
  return a >= 1e12 ? u(a / 1e12, 'trillón', 'trillones') : a >= 1e9 ? u(a / 1e9, 'billón', 'billones') : u(a / 1e6, 'millón', 'millones');
}

export function fmtCap(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return '—';
  return 'US$ ' + bigNum(v);
}
export const fmtCapDelta = (v: number) => (v >= 0 ? '+' : '−') + fmtCap(v);
export const usd = (v: number) => (v < 0 ? '−' : '') + 'US$ ' + nf(Math.abs(v) >= 1e4 ? 0 : 2).format(Math.abs(v));
export const usdSigned = (v: number) => (v >= 0 ? '+' : '−') + 'US$ ' + nf(Math.abs(v) >= 1e4 ? 0 : 2).format(Math.abs(v));

export function mood(c: number) {
  if (c > 1) return { word: 'Día buenísimo', kind: 'up', verb: 'con todo' };
  if (c > 0.3) return { word: 'Buen día', kind: 'up', verb: 'con buen ánimo' };
  if (c > -0.3) return { word: 'Día tranquilo', kind: 'flat', verb: 'tranquilo' };
  if (c > -1) return { word: 'Día flojo', kind: 'down', verb: 'un poco flojo' };
  return { word: 'Día difícil', kind: 'down', verb: 'complicado' };
}

export const todayAR = () => new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
export const symbolPath = (s: string) => '/accion/' + encodeURIComponent(s);
