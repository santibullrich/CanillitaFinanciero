import Link from 'next/link';
import Gem from '@/components/Gem';
import { joyitaCandidates } from '@/lib/joyitas';

export const revalidate = 21600;
export const maxDuration = 60;
export const metadata = { title: 'Joyitas · CanillitaFinanciero' };

export default async function Joyitas() {
  const { rows, source } = await joyitaCandidates();
  const fuertes = rows.filter((r) => r.group === 'fuerte');
  const castigadas = rows.filter((r) => r.group === 'castigada');
  return (
    <>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-copy pl-reveal" style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
        <Link className="back" href="/">← Inicio</Link><span className="pl-eyebrow">Oportunidades según Wall Street</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,84px)', lineHeight: 0.92 }}>Las <mark className="pl-hl">joyitas</mark> de hoy</h1>
        <p className="pl-lede">Buscamos las empresas que más recomiendan los analistas de los grandes bancos de inversión y las que, después de caer, ellos ven baratas.</p>
      </div></div></section>

      <main className="wrap">

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
