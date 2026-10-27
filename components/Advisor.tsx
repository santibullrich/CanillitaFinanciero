'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { symbolPath } from '@/lib/format';

type Move = { accion: string; ticker: string; porcentaje: number; fundamentos: string; tecnico: string };
type Advice = { debilidades: { titulo: string; detalle: string }[]; rotaciones: Record<string, { idea: string; movimientos: Move[] }>; ojo: string };
const ACT: Record<string, string> = { reducir: 'Reducir', vender: 'Vender', sumar: 'Sumar', mantener: 'Mantener' };
const ARROW = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default function Advisor({ hasPositions }: { hasPositions: boolean }) {
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('moderada');
  const [q, setQ] = useState('');
  const ctl = useRef<AbortController | null>(null);

  const ask = async (question?: string) => {
    if (!hasPositions) return setStatus('Cargá al menos una posición para que el asesor tenga algo que mirar.');
    ctl.current?.abort(); ctl.current = new AbortController();
    setBusy(true); setStatus(''); setText(''); if (!question) setAdvice(null);
    try {
      const r = await fetch('/api/advisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }), signal: ctl.current.signal });
      const j = await r.json();
      if (!r.ok) setStatus(j.error ?? 'El asesor no pudo responder. Probá de nuevo.');
      else if (question) setText(j.text ?? '');
      else setAdvice(j);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setStatus('El asesor no pudo responder. Revisá tu conexión.');
    } finally { setBusy(false); }
  };

  const rot = advice?.rotaciones?.[tab];
  return (
    <div className="panel adv">
      <div className="adv-actions">
        <button className="pl-btn primary" type="button" disabled={busy || !hasPositions} onClick={() => ask()}>Buscar mejoras para mi cartera{ARROW}</button>
        {busy && <button className="pl-btn quiet" type="button" onClick={() => ctl.current?.abort()}>Frenar</button>}
      </div>
      <form className="adv-ask" onSubmit={(e) => { e.preventDefault(); if (!q.trim()) return setStatus('Escribí tu pregunta primero.'); ask(q.trim()); }} noValidate>
        <label className="field" style={{ flex: 1 }}><span>O preguntale algo</span><input value={q} onChange={(e) => { setQ(e.target.value); setStatus(''); }} placeholder="¿Qué cambio si quiero cobrar dividendos?" autoComplete="off" /></label>
        <button className="pl-btn quiet" type="submit" disabled={busy}>Preguntar</button>
      </form>
      {status && <p className="err" role="status">{status}</p>}
      <div className="adv-out" aria-live="polite">
        {busy && <p className="thinking">Revisando fundamentos y gráficos de tu cartera y del mercado. Puede tardar un minuto…</p>}
        {text && text.split('\n').filter((l) => l.trim()).map((l, i) => /^Ojo:/.test(l.trim()) ? <p key={i}><span className="ojo">Ojo:</span>{l.trim().slice(4)}</p> : <p key={i}>{l}</p>)}
        {advice && (
          <>
            <div className="adv-weak"><b className="h">Lo que hay que mejorar</b>
              <ul>{(advice.debilidades ?? []).map((d, i) => <li key={i}><b>{d.titulo}.</b> {d.detalle}</li>)}</ul>
            </div>
            <div className="adv-rot"><b className="h">Ideas para rotar tu cartera</b>
              <div className="seg" role="tablist">
                {['conservadora', 'moderada', 'arriesgada'].map((k) => <button key={k} type="button" role="tab" aria-selected={k === tab} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}
              </div>
              {rot?.idea && <p className="idea">{rot.idea}</p>}
              <div className="moves">
                {(rot?.movimientos ?? []).map((m, i) => {
                  const a = String(m.accion || '').toLowerCase();
                  return (
                    <div className="move" key={i}>
                      <div className="mv-top"><span className={`act act-${a}`}>{ACT[a] ?? m.accion}</span><Link href={symbolPath(m.ticker)} className="mv-name">{m.ticker}</Link>{Number(m.porcentaje) > 0 && <b className="pl-num">{Math.round(Number(m.porcentaje))}%</b>}</div>
                      <p><span className="k">Fundamentos</span> {m.fundamentos}</p>
                      <p><span className="k">Técnico</span> {m.tecnico}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <p><span className="ojo">Ojo:</span> {advice.ojo || 'Son ideas para evaluar, no órdenes de compra o venta.'}</p>
          </>
        )}
      </div>
      <p className="note">El asesor usa IA y puede equivocarse. Sus rotaciones son ideas para evaluar, no órdenes de compra o venta, y el análisis técnico no predice el futuro. Antes de decidir, informate o consultá con un asesor registrado.</p>
    </div>
  );
}
