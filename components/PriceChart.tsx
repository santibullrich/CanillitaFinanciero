'use client';
import { useEffect, useState } from 'react';
import { nf } from '@/lib/format';

type P = { t: string; p: number };
const RANGES = ['1D', '1S', '1M', '1A'] as const;
const LABEL: Record<string, string> = { '1D': 'hoy', '1S': 'en la semana', '1M': 'en el mes', '1A': 'en el año' };

function Chart({ pts, range }: { pts: P[]; range: string }) {
  const W = 640, H = 220, L = 6, R = 64, T = 12, B = 24, iw = W - L - R, ih = H - T - B;
  const vals = pts.map((x) => x.p);
  const mn = Math.min(...vals), mx = Math.max(...vals), pad = (mx - mn) * 0.08 || 1, lo = mn - pad, hi = mx + pad;
  const x = (i: number) => L + (i * iw) / (vals.length - 1), y = (v: number) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const up = vals[vals.length - 1] >= vals[0];
  const col = `var(--${up ? 'up' : 'down'})`;
  const line = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
  const lx = x(vals.length - 1), ly = y(vals[vals.length - 1]);
  const d = (v: number) => nf(v >= 1000 ? 0 : v < 1 ? 4 : 2).format(v);
  const fmtT = (t: string) => range === '1D' ? t.slice(11, 16) : new Date(t.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', range === '1A' ? { month: 'short' } : { day: 'numeric', month: 'short' });
  const ticks = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución del precio ${LABEL[range]}`}>
      <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".2" /><stop offset="1" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      {[0.5, 1.5, 2.5].map((k) => { const v = lo + ((hi - lo) * k) / 3; return <g key={k}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="2 5" /><text x={W - R + 8} y={y(v) + 3}>{d(v)}</text></g>; })}
      <path d={`${line}L${lx} ${T + ih}L${L} ${T + ih}Z`} fill="url(#g)" />
      <path d={line} fill="none" stroke={col} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="9" fill="var(--resaltador)" opacity=".35" />
      <circle cx={lx} cy={ly} r="4.5" fill={col} stroke="var(--ink)" strokeWidth="1.5" />
      {ticks.map((i, k) => <text key={k} x={x(i)} y={H - 6} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>{fmtT(pts[i].t)}</text>)}
    </svg>
  );
}

export default function PriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<string>('1D');
  const [pts, setPts] = useState<P[] | null>(null);
  useEffect(() => {
    let alive = true;
    setPts(null);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`).then((r) => r.json()).then((j) => { if (alive) setPts(j.points ?? []); }).catch(() => alive && setPts([]));
    return () => { alive = false; };
  }, [symbol, range]);
  const ch = pts && pts.length > 1 ? (pts[pts.length - 1].p / pts[0].p - 1) * 100 : null;
  return (
    <div className="hero-board" style={{ gap: 10 }}>
      <div className="ranges" role="group" aria-label="Período">
        {RANGES.map((r) => <button key={r} type="button" aria-pressed={r === range} onClick={() => setRange(r)}>{r}</button>)}
        {ch != null && <span className={`pl-num pl-${ch >= 0 ? 'up' : 'down'}`} style={{ marginLeft: 'auto', fontSize: 13, alignSelf: 'center' }}>{(ch >= 0 ? '+' : '−') + nf(2).format(Math.abs(ch))}% {LABEL[range]}</span>}
      </div>
      <div className="chartbox">
        {pts === null ? <p className="note" style={{ padding: 40, textAlign: 'center' }}>Cargando gráfico…</p>
          : pts.length < 2 ? <p className="note" style={{ padding: 40, textAlign: 'center' }}>No hay datos para este período.</p>
          : <Chart pts={pts} range={range} />}
      </div>
    </div>
  );
}
