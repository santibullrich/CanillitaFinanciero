import Link from 'next/link';
import Badge from '@/components/Badge';
import Flag from '@/components/Flag';
import Meter from '@/components/Meter';
import DataNotice from '@/components/DataNotice';
import WorldMap, { type Pin } from '@/components/WorldMap';
import { LiveProvider } from '@/components/Live';
import { StockList, type RowData } from '@/components/StockRow';
import { worldSafe, worldTitle, type Row } from '@/lib/data';
import { getQuotes } from '@/lib/fmp';
import { THEMES } from '@/lib/themes';
import { absPct, dir, fmtCap, fmtCapDelta, fmtPct, mood, todayAR } from '@/lib/format';
import { isOpen } from '@/lib/markets';

export const revalidate = 120;

const toRow = (q: Row): RowData => ({ symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct, market: q.market, currency: q.currency });
const ARROW = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default async function Home() {
  const [w, themeQuotes] = await Promise.all([worldSafe(), getQuotes(THEMES.flatMap((t) => t.symbols), 120).catch(() => [])]);
  const tq = new Map(themeQuotes.map((q) => [q.symbol, q] as const));
  const geo = w.snaps.filter((s) => s.market.id !== 'cr');
  const best = [...geo].sort((a, b) => b.changePct - a.changePct)[0];
  const worst = [...geo].sort((a, b) => a.changePct - b.changePct)[0];
  const top = w.gainers[0];
  const [pre, hl, post] = worldTitle(w.avg);
  const pins: Pin[] = geo.filter((s) => s.market.lonLat).map((s) => ({ id: s.market.id, city: s.market.city, changePct: s.changePct, lonLat: s.market.lonLat!, label: s.market.label ?? 'r' }));
  const maxCap = Math.max(1, ...w.snaps.map((s) => s.capUsd));
  const liveSymbols = [...w.gainers, ...w.losers].map((q) => q.symbol);

  return (
    <LiveProvider symbols={liveSymbols}>
      {w.failed && <DataNotice />}
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-grid">
        <div className="hero-copy pl-reveal">
          <span className="pl-eyebrow pl-live">En vivo · {todayAR()}</span>
          <h1>{pre} <mark className="pl-hl">{hl}</mark> {post}</h1>
          <p className="pl-lede">
            En promedio, las bolsas del mundo {w.avg >= 0 ? 'suben' : 'bajan'} <strong>{absPct(w.avg)}</strong>.
            {best && <> A <strong>{best.market.name}</strong> le va mejor que a nadie ({fmtPct(best.changePct)})</>}
            {worst && worst.changePct < 0 && <> y <strong>{worst.market.name}</strong> es el que más sufre ({fmtPct(worst.changePct)})</>}.
            {top && <> La empresa grande que más brilla es <strong>{top.name}</strong>, que sube {absPct(top.changePct)}.</>}
          </p>
          <div className="hero-ctas"><a className="pl-btn primary" href="#mundo">Dar la vuelta al mundo{ARROW}</a><Link className="pl-link" href="/joyitas">Ver las joyitas de los analistas</Link></div>
        </div>
        <div className="hero-board quiet">
          <span className="pl-eyebrow">Promedio de las bolsas del mundo</span>
          <div className={`pl-bignum pl-${dir(w.avg)}`}>{fmtPct(w.avg)}</div>
          <Meter c={w.avg} />
        </div>
      </div></div></section>

      <main className="wrap">
        <section className="sec" id="mundo">
          <div className="sechead"><span className="pl-eyebrow">La vuelta al mundo</span><h2>Los mercados del mundo</h2><p>Tocá un punto del mapa o una fila para ver qué pasa en cada bolsa. En <Link className="pl-link" href="/explorar">Explorar</Link> tenés todas sus acciones.</p></div>
          {pins.length > 0 && <WorldMap pins={pins} />}
          <div className="pl-list">
            {w.snaps.map((s) => (
              <Link className="pl-row mrow" key={s.market.id} href={`/mercado/${s.market.id}`}>
                <span className="pl-name"><Flag id={s.market.id} />{s.market.name}</span>
                <span className="pl-side"><Badge c={s.changePct} /></span>
                <span className="pl-meta">{s.market.indexName} · <span className="mood">{mood(s.changePct).word}</span> · {isOpen(s.market) ? (s.market.id === 'cr' ? 'abierto 24/7' : 'abierto') : 'cerrado'}</span>
                <span className="capline">Vale <b>{fmtCap(s.capUsd)}</b> · hoy <b className={`pl-${dir(s.capDeltaUsd)}`}>{fmtCapDelta(s.capDeltaUsd)}</b></span>
              </Link>
            ))}
          </div>
          <div className="capbars">
            <div className="sechead"><span className="pl-eyebrow">Tamaño de cada mercado</span><p>Cuánto valen juntas todas las empresas (o monedas) de cada mercado, y cuánta plata ganaron o perdieron hoy.</p></div>
            <div className="pl-list">
              {[...w.snaps].sort((a, b) => b.capUsd - a.capUsd).map((s) => (
                <Link className="capbar" key={s.market.id} href={`/mercado/${s.market.id}`}>
                  <span className="nm"><Flag id={s.market.id} />{s.market.name}</span>
                  <span className="track"><i style={{ width: `${Math.max(0.8, (s.capUsd / maxCap) * 100).toFixed(1)}%` }} /></span>
                  <span className="v"><b>{fmtCap(s.capUsd)}</b><small className={`pl-${dir(s.capDeltaUsd)}`}>{fmtCapDelta(s.capDeltaUsd)}</small></span>
                </Link>
              ))}
            </div>
            <p className="note">Suma del valor de mercado de todas las acciones que cotizan en cada bolsa, convertido a dólares.</p>
          </div>
        </section>
        <hr className="rule" />
        <div className="pair">
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Subas del día</span><h2>Las que más suben</h2><p>Empresas grandes de todo el mundo a las que mejor les va hoy.</p></div><StockList rows={w.gainers.map(toRow)} empty="Hoy ninguna sube." /></section>
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Bajas del día</span><h2>Las que más bajan</h2><p>Una mala jornada no define a una empresa. Entrá para ver qué pasó.</p></div><StockList rows={w.losers.map(toRow)} empty="Hoy ninguna baja." /></section>
        </div>
        <section className="sec" id="temas">
          <div className="sechead"><span className="pl-eyebrow">Explorá por temas</span><h2>¿Qué te entusiasma?</h2><p>Empresas de todo el mundo agrupadas por la idea detrás de ellas. Las barritas muestran cuánto riesgo tiene cada tema.</p></div>
          <div className="pl-mosaic">
            {THEMES.map((t) => {
              const qs = t.symbols.map((s) => tq.get(s)).filter(Boolean) as { changePct: number }[];
              const avg = qs.length ? qs.reduce((a, q) => a + q.changePct, 0) / qs.length : 0;
              return (
                <Link key={t.id} className={`pl-tile${t.feat ? ' tall' : ''}`} href={`/tema/${t.id}`}>
                  <div><h3>{t.name}</h3>{t.feat && <p>{t.desc}</p>}</div>
                  <div className="foot"><Badge c={avg} /><span className="pl-risk" aria-label={`Riesgo ${t.risk} de 5`}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= t.risk ? 'on' : ''} />)}</span></div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="sec">
          <div className="sechead"><span className="pl-eyebrow">¿Primera vez?</span><h2>El manual de Doña Rosa</h2><p>Invertir es más simple de lo que parece. Tres ideas para arrancar.</p></div>
          <div className="tips">
            <div className="tip"><div><h3>Empezá con poco</h3><p>No hace falta mucha plata. Lo importante es arrancar y entender cómo se mueve lo que compraste.</p></div></div>
            <div className="tip"><div><h3>Repartí</h3><p>Con empresas de distintos países y rubros, un mal día de una no te arruina el mes.</p></div></div>
            <div className="tip"><div><h3>Pensá en años</h3><p>Los precios suben y bajan todos los días. A largo plazo, lo que cuenta es que la empresa crezca.</p></div></div>
          </div>
          <div><Link className="pl-btn primary" href="/cartera">Armar mi cartera{ARROW}</Link></div>
        </section>
      </main>
    </LiveProvider>
  );
}
