import type { Point } from './yahoo';

export type Technicals = {
  ret1m: number | null;
  ret1y: number | null;
  distHigh1y: number | null;
  distLow1y: number | null;
  aboveSma50: boolean | null;
  aboveSma200: boolean | null;
  rsi14: number | null;
  volAnnual: number | null;
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const sma = (a: number[], n: number) => (a.length >= n ? a.slice(-n).reduce((s, x) => s + x, 0) / n : null);

/** Indicadores técnicos simples a partir de cierres diarios (más viejo primero). */
export function technicals(points: Point[], price?: number): Technicals {
  const c = points.map((p) => p.p).filter((x) => isFinite(x) && x > 0);
  if (c.length < 15) return { ret1m: null, ret1y: null, distHigh1y: null, distLow1y: null, aboveSma50: null, aboveSma200: null, rsi14: null, volAnnual: null };
  const last = price && price > 0 ? price : c[c.length - 1];
  const m1 = c[Math.max(0, c.length - 22)];
  const hi = Math.max(...c), lo = Math.min(...c);
  let g = 0, l = 0;
  for (let i = c.length - 14; i < c.length; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; }
  const rsi = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  const rets: number[] = [];
  for (let i = Math.max(1, c.length - 60); i < c.length; i++) rets.push(Math.log(c[i] / c[i - 1]));
  const mu = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mu) ** 2, 0) / rets.length);
  const s50 = sma(c, 50), s200 = sma(c, 200);
  return {
    ret1m: r1((last / m1 - 1) * 100),
    ret1y: r1((last / c[0] - 1) * 100),
    distHigh1y: r1((last / hi - 1) * 100),
    distLow1y: r1((last / lo - 1) * 100),
    aboveSma50: s50 === null ? null : last > s50,
    aboveSma200: s200 === null ? null : last > s200,
    rsi14: Math.round(rsi),
    volAnnual: Math.round(sd * Math.sqrt(252) * 100)
  };
}

export const isoDaysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
