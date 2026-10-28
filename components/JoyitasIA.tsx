'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import { symbolPath } from '@/lib/format';

type Pick = { ticker: string; nombre: string; perfil: 'conservadora' | 'moderada' | 'arriesgada'; titulo: string; tesis: string; barata: string; riesgo: string };
const PERFIL: Record<Pick['perfil'], string> = { conservadora: 'Conservadora', moderada: 'Moderada', arriesgada: 'Arriesgada' };

export default function JoyitasIA() {
  const [d, setD] = useState<{ intro: string; picks: Pick[] } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch('/api/joyitas').then((r) => r.json()).then((j) => (j.error ? setErr(true) : setD(j))).catch(() => setErr(true)); }, []);
  if (err) return <p className="note">La selección con IA no está disponible ahora. Abajo tenés las candidatas de los analistas.</p>;
  if (!d) return <p className="note">Claude está cruzando analistas, números, gráficos y redes para elegir las joyitas de hoy. Tarda unos segundos…</p>;
  return (
    <>
      {d.intro && <p className="xsum">{d.intro}</p>}
      <div className="jgrid">
        {d.picks.map((p) => (
          <Link className={`panel jpick ${p.perfil}`} key={p.ticker} href={symbolPath(p.ticker)}>
            <em className="xtag">{PERFIL[p.perfil]}</em>
            <span className="pl-name"><Logo symbol={p.ticker} name={p.nombre} />{p.nombre}</span>
            <b>{p.titulo}</b>
            <p>{p.tesis}</p>
            <p><span className="k">Por qué podría estar barata.</span> {p.barata}</p>
            <p className="risk"><span className="k">Ojo.</span> {p.riesgo}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
