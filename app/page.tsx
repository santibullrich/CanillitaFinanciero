import Link from 'next/link';
import Badge from '@/components/Badge';
import Flag from '@/components/Flag';
import Meter from '@/components/Meter';
import DataNotice from '@/components/DataNotice';
import WorldMap, { type Pin } from '@/components/WorldMap';
import { LiveProvider } from '@/components/Live';
import { StockList, type RowData } from '@/components/StockRow';
import { worldSafe, worldTitle, type Row } from '@/lib/data';
import { getQuotes } from '@/lib/yahoo';
import { THEMES } from '@/lib/themes';
import { absPct, dir, fmtPct, mood, todayAR } from '@/lib/format';
import { isOpen } from '@/lib/markets';
import PlanSimulator from '@/components/PlanSimulator';
import Gem from '@/components/Gem';
import { joyitaCandidates } from '@/lib/joyitas';
import { assetRates } from '@/lib/assetRates';

export const revalidate = 120;
export const maxDuration = 60;

const toRow = (q: Row): RowData => ({ symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct, market: q.market, currency: q.currency });
const ARROW = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default async function Home() {
  const [w, themeQuotes, assets, joy] = await Promise.all([worldSafe(), getQuotes(THEMES.flatMap((t) => t.symbols), 120).catch(() => []), assetRates(), joyitaCandidates()]);
  // Joyitas en la portada: las 4 con más consenso y las 2 castigadas con más potencial.
  const gems = [...joy.rows.filter((r) => r.group === 'fuerte').slice(0, 4), ...joy.rows.filter((r) => r.group === 'castigada').slice(0, 2)];
  const tq = new Map(themeQuotes.map((q) => [q.symbol, q] as const));
  const geo = w.snaps.filter((s) => s.market.id !== 'cr');
  const best = [...geo].sort((a, b) => b.changePct - a.changePct)[0];
  const worst = [...geo].sort((a, b) => a.changePct - b.changePct)[0];
  const top = w.gainers[0];
  const [pre, hl, post] = worldTitle(w.avg);
  const pins: Pin[] = geo.filter((s) => s.market.lonLat).map((s) => ({ id: s.market.id, city: s.market.city, changePct: s.changePct, lonLat: s.market.lonLat!, label: s.market.label ?? 'r', minor: s.market.minor }));
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
          <div className="sechead"><span className="pl-eyebrow">La vuelta al mundo</span><h2>Los mercados del mundo</h2><p><span className="desk-only">Tocá un punto del mapa o una fila</span><span className="mob-only">Tocá una bolsa</span> para ver qué pasa en cada una. En <Link className="pl-link" href="/explorar">Explorar</Link> tenés todas sus acciones.</p></div>
          {pins.length > 0 && <WorldMap pins={pins} />}
          <div className="pl-list">
            {w.snaps.map((s) => (
              <Link className="pl-row mrow" key={s.market.id} href={`/mercado/${s.market.id}`}>
                <span className="pl-name"><Flag id={s.market.id} />{s.market.name}</span>
                <span className="pl-side"><Badge c={s.changePct} /></span>
                <span className="pl-meta">{s.market.indexName} · <span className="mood">{mood(s.changePct).word}</span> · {isOpen(s.market) ? (s.market.id === 'cr' ? 'abierto 24/7' : 'abierto') : 'cerrado'}</span>
              </Link>
            ))}
          </div>
        </section>
        <hr className="rule" />
        <div className="pair">
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Subas del día</span><h2>Las que más suben</h2><p>Empresas grandes de todo el mundo a las que mejor les va hoy.</p></div><StockList rows={w.gainers.map(toRow)} empty="Hoy ninguna sube." /></section>
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Bajas del día</span><h2>Las que más bajan</h2><p>Una mala jornada no define a una empresa. Entrá para ver qué pasó.</p></div><StockList rows={w.losers.map(toRow)} empty="Hoy ninguna baja." /></section>
        </div>
        {gems.length > 0 && (
          <section className="sec" id="joyitas">
            <div className="sechead"><span className="pl-eyebrow">Oportunidades según Wall Street</span><h2>Las joyitas de hoy</h2><p>Lo que más recomiendan los analistas de los grandes bancos y algunas que, después de caer, ellos ven baratas.</p></div>
            <div className="gem-grid">{gems.map((c) => <Gem key={c.symbol} c={c} />)}</div>
            <div><Link className="pl-btn quiet" href="/joyitas" style={{ width: 'auto', display: 'inline-flex' }}>Ver todas las joyitas en detalle{ARROW}</Link></div>
          </section>
        )}
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
        <PlanSimulator assets={assets} />
      </main>
    </LiveProvider>
  );
}
