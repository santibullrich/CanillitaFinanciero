'use client';
import { useEffect, useState } from 'react';

type Motivo = { tipo: 'noticias' | 'fundamentos' | 'tecnico' | 'analistas' | 'mercado'; titulo: string; detalle: string };
type Data = { resumen: string; motivos: Motivo[]; sources: { title: string; site: string; url: string }[]; usados: string[]; generated: boolean };

const TAG: Record<Motivo['tipo'], string> = { noticias: 'Noticias', fundamentos: 'Fundamentos', tecnico: 'Técnico', analistas: 'Analistas', mercado: 'Mercado' };
const IC_UP = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>;
const IC_DN = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l10 10M17 9v8H9" /></svg>;

export default function Explain({ symbol, up }: { symbol: string; up: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`/api/explain/${encodeURIComponent(symbol)}`).then((r) => r.json()).then((j) => j.error ? setErr(true) : setD(j)).catch(() => setErr(true));
  }, [symbol]);
  const k = up ? 'up' : 'down';
  if (err) return <p className="note">No pudimos armar la explicación ahora. Probá en un rato.</p>;
  if (!d) return <p className="note">Leyendo noticias, números y gráficos del día…</p>;
  const motivos = d.motivos ?? [];
  return (
    <>
      {d.resumen && <p className="xsum">{d.resumen}</p>}
      {motivos.length > 0 ? (
        <ul className="reasons">
          {motivos.map((r, i) => (
            <li key={i}>
              <span className={`ic pl-${k}`} style={{ background: `color-mix(in oklab,var(--${k}) 12%,var(--ground-raised))` }}>{up ? IC_UP : IC_DN}</span>
              <div><em className="xtag">{TAG[r.tipo] ?? 'Mercado'}</em><b>{r.titulo}</b><span>{r.detalle}</span></div>
            </li>
          ))}
        </ul>
      ) : <p className="note">Hoy no pudimos armar la explicación. A veces las acciones se mueven con el resto del mercado.</p>}
      {d.generated && d.usados?.length > 0 && <p className="src" style={{ marginTop: 14 }}>Explicación hecha con IA (Claude) cruzando: {d.usados.join(', ')}.</p>}
      {d.sources.length > 0 && (
        <div className="src">
          <p style={{ marginBottom: 6 }}>Noticias que leímos:</p>
          <ul className="srclist">{d.sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> <span>· {s.site}</span></li>)}</ul>
        </div>
      )}
    </>
  );
}
