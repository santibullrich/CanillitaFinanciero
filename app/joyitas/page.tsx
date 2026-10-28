import Link from 'next/link';
import Flag from '@/components/Flag';
import Logo from '@/components/Logo';
import JoyitasIA from '@/components/JoyitasIA';
import { joyitaCandidates, type Candidate } from '@/lib/joyitas';
import { marketOfSymbol } from '@/lib/markets';
import { nf, symbolPath } from '@/lib/format';

export const revalidate = 21600;
export const maxDuration = 60;
export const metadata = { title: 'Joyitas · CanillitaFinanciero' };

function Gem({ c }: { c: Candidate }) {
  const tenths = c.buyPct != null ? Math.round(c.buyPct / 10) : 0;
  const m = marketOfSymbol(c.symbol);
  const extra = [
    c.off52wHigh != null && c.off52wHigh <= -10 ? `${nf(0).format(-c.off52wHigh)}% abajo de su máximo del año` : '',
    c.social != null ? (c.social > 5 ? 'en redes hablan bien' : c.social < -5 ? 'en redes hablan mal' : '') : ''
  ].filter(Boolean).join(' · ');
  return (
    <Link className="gem" href={symbolPath(c.symbol)}>
      <div className="t">
        <div><div className="pl-eyebrow eyeflag"><Flag id={m} />{c.symbol}</div><span className="pl-name"><Logo symbol={c.symbol} name={c.name} />{c.name}</span></div>
        {c.upside != null
          ? <div className="pot"><b>+{nf(0).format(c.upside)}%</b><small>ven de potencial</small></div>
          : c.buyPct != null && <div className="pot"><b>{c.buyPct}%</b><small>dicen comprar</small></div>}
      </div>
      {c.buyPct != null && <div className="votes" aria-label={`${tenths} de cada 10 analistas dicen comprar`}>{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < tenths ? 'y' : ''} />)}</div>}
      <span className="src">{tenths} de cada 10 analistas dicen “comprar”{c.analysts ? ` · ${c.analysts} analistas` : ''}{extra ? ` · ${extra}` : ''}</span>
    </Link>
  );
}

export default async function Joyitas() {
  const { rows, source } = await joyitaCandidates();
  const fuertes = rows.filter((r) => r.group === 'fuerte');
  const castigadas = rows.filter((r) => r.group === 'castigada');
  return (
    <>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-copy pl-reveal" style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
        <Link className="back" href="/">← Inicio</Link><span className="pl-eyebrow">Oportunidades según Wall Street</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,84px)', lineHeight: 0.92 }}>Las <mark className="pl-hl">joyitas</mark> de hoy</h1>
        <p className="pl-lede">Buscamos las empresas que más recomiendan los analistas de los grandes bancos de inversión y las que, después de caer, ellos ven baratas. Después, la IA de Claude cruza esos datos con los números de cada empresa, su gráfico y lo que se dice en redes, y elige seis.</p>
      </div></div></section>

      <main className="wrap">
        <section className="sec">
          <div className="sechead"><span className="pl-eyebrow">Elegidas con IA</span><h2>La selección de Claude</h2><p>Una para cada tipo de inversor: conservadora, moderada y arriesgada.</p></div>
          <JoyitasIA />
        </section>

        <section className="sec">
          <div className="sechead"><span className="pl-eyebrow">Consenso fuerte</span><h2>Las que más recomiendan</h2><p>Empresas grandes que siguen al menos 10 analistas, donde 3 de cada 4 o más dicen “comprar”, ordenadas por cuánto creen que puede subir.</p></div>
          {fuertes.length ? <div className="pl-list">{fuertes.map((c) => <Gem key={c.symbol} c={c} />)}</div> : <p className="note">Hoy no encontramos empresas que cumplan las condiciones.</p>}
        </section>

        <section className="sec">
          <div className="sechead"><span className="pl-eyebrow">Posibles subvaluadas</span><h2>Castigadas, pero recomendadas</h2><p>Cayeron 25% o más desde su máximo del año, pero los analistas las siguen recomendando y ven mucho potencial.</p></div>
          {castigadas.length ? <div className="pl-list">{castigadas.map((c) => <Gem key={c.symbol} c={c} />)}</div> : <p className="note">Hoy no hay empresas castigadas que los analistas sigan recomendando.</p>}
        </section>

        <p className="note">Datos de analistas: {source === 'sentisense' ? 'consenso de Wall Street vía SentiSense' : 'consenso de analistas vía Finnhub'}. Los analistas también se equivocan: usalo para investigar, no como una orden de compra.</p>
      </main>
    </>
  );
}
