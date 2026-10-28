'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Flag from './Flag';
import { MAP, landDots, lonLatToCell } from '@/lib/worldmask';
import { dir, fmtPct } from '@/lib/format';

export type Pin = { id: string; city: string; changePct: number; lonLat: [number, number]; label: string; minor?: boolean };
const ARCS: [string, string][] = [['ar', 'br'], ['br', 'us'], ['mx', 'us'], ['ca', 'us'], ['us', 'uk'], ['uk', 'eu'], ['eu', 'in'], ['in', 'hk'], ['hk', 'jp'], ['hk', 'au']];
const COL: Record<string, number[]> = { up: [75, 208, 143], down: [255, 107, 107], flat: [201, 196, 186] };

export default function WorldMap({ pins }: { pins: Pin[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [clock, setClock] = useState('');
  const dots = useMemo(() => {
    const base = landDots();
    return base.map((d) => {
      let near = '', nd = 1e9;
      for (const p of pins) { const [x, y] = lonLatToCell(p.lonLat); const dd = Math.hypot(d.x - x, d.y - y); if (dd < nd) { nd = dd; near = p.id; } }
      return { ...d, near, nd, tw: Math.random() * 6.28 };
    });
  }, [pins]);

  useEffect(() => {
    setClock(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) + ' en Buenos Aires');
    const c = cv.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, raf = 0; const t0 = performance.now();
    const size = () => { const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (W && !raf) raf = requestAnimationFrame(draw); };
    const byId = Object.fromEntries(pins.map((p) => [p.id, p]));
    const draw = (now: number) => {
      raf = 0;
      const t = (now - t0) / 1000, sx = W / MAP.cols, sy = H / MAP.rows, r = Math.max(0.9, Math.min(sx, sy) * 0.3);
      ctx.clearRect(0, 0, W, H);
      const reveal = reduce ? 2 : Math.min(2, (t / 1.4) * 1.15), scan = reduce ? -9 : ((t % 7) / 7) * (MAP.cols + 40) - 20;
      for (const d of dots) {
        const p = d.x / MAP.cols; if (p > reveal) continue;
        const fresh = Math.max(0, 1 - (reveal - p) * 6);
        const pin = byId[d.near]; const g = pin && d.nd < 9 ? 1 - d.nd / 9 : 0; const col = COL[dir(pin?.changePct ?? 0)];
        const inten = g * Math.min(1, 0.35 + Math.abs(pin?.changePct ?? 0) / 2.5);
        const sc = Math.max(0, 1 - Math.abs(d.x - scan) / 5) * 0.5;
        const tw = reduce ? 0 : (Math.sin(t * 1.6 + d.tw) + 1) * 0.08;
        const R = Math.round(200 + (col[0] - 200) * inten), G = Math.round(196 + (col[1] - 196) * inten), B = Math.round(186 + (col[2] - 186) * inten);
        ctx.fillStyle = `rgba(${R},${G},${B},${Math.min(1, 0.22 + inten * 0.6 + sc + tw + fresh * 0.7)})`;
        ctx.beginPath(); ctx.arc(d.x * sx, d.y * sy, r * (1 + inten * 0.35 + fresh * 0.6), 0, 6.283); ctx.fill();
      }
      // En celulares el mapa está oculto (ancho 0): no se sigue dibujando hasta que vuelva a verse.
      if (!reduce && W) raf = requestAnimationFrame(draw);
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(c);
    if (!raf) raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [dots, pins]);

  const pos = (p: Pin) => { const [x, y] = lonLatToCell(p.lonLat); return { left: `${(x / MAP.cols) * 100}%`, top: `${(y / MAP.rows) * 100}%` }; };
  const byId = Object.fromEntries(pins.map((p) => [p.id, p]));

  return (
    <div className="pl-map-night mapbox">
      <div className="maphead"><b>Mapa en vivo</b><span>{clock}</span></div>
      <div className="map">
        <canvas ref={cv} />
        <svg viewBox={`0 0 ${MAP.cols} ${MAP.rows}`} preserveAspectRatio="none" aria-hidden="true">
          {ARCS.filter(([a, b]) => byId[a] && byId[b]).map(([a, b], i) => {
            const [x1, y1] = lonLatToCell(byId[a].lonLat), [x2, y2] = lonLatToCell(byId[b].lonLat);
            const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.28;
            const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
            return <g key={a + b}><path className="arc" d={d} pathLength={1} style={{ animationDelay: `${0.6 + i * 0.15}s` }} /><path className="arcflow" d={d} pathLength={100} style={{ animationDelay: `${1.8 + i * 0.5}s` }} /></g>;
          })}
        </svg>
        {pins.map((p, i) => (
          <Link key={p.id} className={`mpin ${dir(p.changePct)}${p.minor ? ' minor' : ''}`} href={`/mercado/${p.id}`} style={{ ...pos(p), animationDelay: `${0.9 + i * 0.12}s` }} aria-label={p.city}>
            <span className="ring" /><span className="core" />
            <span className={`lab ${p.label}`}><Flag id={p.id} /><b>{p.city}</b><span className="pl-num">{fmtPct(p.changePct)}</span></span>
          </Link>
        ))}
      </div>
      <div className="mapchips">
        {pins.map((p) => <Link key={p.id} className="mpchip" href={`/mercado/${p.id}`}><Flag id={p.id} />{p.city} <span className="pl-num">{fmtPct(p.changePct)}</span></Link>)}
      </div>
    </div>
  );
}
