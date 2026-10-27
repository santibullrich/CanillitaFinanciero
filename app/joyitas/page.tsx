import Link from 'next/link';
import Flag from '@/components/Flag';
import Logo from '@/components/Logo';
import { getGrades, getPriceTarget, getQuotes } from '@/lib/yahoo';
import { UNIVERSE } from '@/lib/themes';
import { marketById, marketOfSymbol } from '@/lib/markets';
import { nf, symbolPath } from '@/lib/format';

export const revalidate = 21600;
export const maxDuration = 60;

export default async function Joyitas() {
  const symbols = UNIVERSE.filter((s) => marketOfSymbol(s) !== 'cr');
  const quotes = await getQuotes(symbols, 3600).catch(() => []);
  const picks: { q: (typeof quotes)[number]; up: number; tenths: number; total: number }[] = [];
  for (let i = 0; i < quotes.length; i += 8) {
    const res = await Promise.all(quotes.slice(i, i + 8).map(async (q) => {
      const [t, g] = await Promise.all([getPriceTarget(q.symbol).catch(() => null), getGrades(q.symbol).catch(() => null)]);
      if (!t?.consensus || !g || !q.price) return null;
      const buy = g.strongBuy + g.buy, total = buy + g.hold + g.sell + g.strongSell;
      if (total < 5) return null;
      return { q, up: t.consensus / q.price - 1, tenths: Math.round((buy / total) * 10), total };
    }));
    picks.push(...(res.filter(Boolean) as any));
  }
  const best = picks.filter((p) => p.up > 0.15 && p.tenths >= 6).sort((a, b) => b.up - a.up).slice(0, 12);
  return (
    <>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-copy pl-reveal" style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
        <Link className="back" href="/">← Inicio</Link><span className="pl-eyebrow">Selección de analistas</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,84px)', lineHeight: 0.92 }}>Joyitas de los <mark className="pl-hl">analistas</mark></h1>
        <p className="pl-lede">Empresas grandes donde al menos 6 de cada 10 analistas dicen “comprar” y el precio objetivo promedio está más de 15% arriba del precio de hoy.</p>
      </div></div></section>
      <main className="wrap"><section className="sec">
        {best.length ? (
          <div className="pl-list">
            {best.map(({ q, up, tenths, total }) => { const m = marketOfSymbol(q.symbol, q.exchange); return (
              <Link className="gem" key={q.symbol} href={symbolPath(q.symbol)}>
                <div className="t"><div><div className="pl-eyebrow eyeflag"><Flag id={m} />{marketById(m)?.name}</div><span className="pl-name"><Logo symbol={q.symbol} name={q.name} />{q.name}</span></div>
                  <div className="pot"><b>+{nf(0).format(up * 100)}%</b><small>podría subir</small></div></div>
                <div className="votes" aria-label={`${tenths} de cada 10 analistas dicen comprar`}>{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < tenths ? 'y' : ''} />)}</div>
                <span className="src">{tenths} de cada 10 analistas dicen “comprar” · {total} analistas</span>
              </Link>); })}
          </div>
        ) : <p className="note">Hoy no encontramos empresas que cumplan las condiciones. Volvé más tarde.</p>}
        <p className="note">Los analistas también se equivocan. Usalo para investigar, no como una orden de compra.</p>
      </section></main>
    </>
  );
}
