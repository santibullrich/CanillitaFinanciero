import Link from 'next/link';
import { notFound } from 'next/navigation';
import Explain from '@/components/Explain';
import Flag from '@/components/Flag';
import FollowButton from '@/components/FollowButton';
import LivePrice from '@/components/LivePrice';
import Logo from '@/components/Logo';
import PriceChart from '@/components/PriceChart';
import { LiveProvider } from '@/components/Live';
import { getFx, getGrades, getPriceTarget, getProfile, getQuote, getRatios } from '@/lib/yahoo';
import { marketById, marketOfSymbol } from '@/lib/markets';
import { bigNum, fmtCap, fmtUsd, nf, toUsd } from '@/lib/format';
import { supabaseServer } from '@/lib/supabase/server';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { symbol: string } }) {
  const q = await getQuote(decodeURIComponent(params.symbol)).catch(() => null);
  return { title: q ? `${q.name} · CanillitaFinanciero` : 'CanillitaFinanciero' };
}

export default async function StockPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  const quote = await getQuote(symbol);
  if (!quote) notFound();
  const mId = marketOfSymbol(symbol, quote.exchange);
  const crypto = mId === 'cr';
  const m = marketById(mId) ?? { id: 'xx', name: 'Otros mercados', currency: 'USD' };
  const [profile, ratios, grades, target, fx] = await Promise.all([
    getProfile(symbol).catch(() => null),
    crypto ? null : getRatios(symbol).catch(() => null),
    crypto ? null : getGrades(symbol).catch(() => null),
    crypto ? null : getPriceTarget(symbol).catch(() => null),
    getFx().catch(() => ({ USD: 1 }) as Record<string, number>)
  ]);
  let loggedIn = false;
  try { loggedIn = !!(await supabaseServer().auth.getUser()).data.user; } catch { /* sin Supabase */ }

  const cur = quote.currency || profile?.currency || m.currency;
  const up = quote.changePct >= 0;
  const px = (v: number | null | undefined) => fmtUsd(v, cur, fx);
  const capUsd = toUsd(quote.marketCap ?? profile?.marketCap, cur, fx);
  const buy = grades ? grades.strongBuy + grades.buy : 0;
  const total = grades ? buy + grades.hold + grades.sell + grades.strongSell : 0;
  const tenths = total ? Math.round((buy / total) * 10) : 0;
  const verdict = !total ? '' : buy / total > 0.6 ? 'la mayoría recomienda comprar' : (grades!.sell + grades!.strongSell) / total > 0.3 ? 'muchos recomiendan vender' : 'la mayoría sugiere esperar';
  const tgt = target?.consensus ?? null;
  const upside = tgt && quote.price ? tgt / quote.price - 1 : null;
  const lo = tgt ? Math.min(quote.price, tgt) * 0.9 : 0, hi = tgt ? Math.max(quote.price, tgt) * 1.06 : 1;
  const pos = (v: number) => (((v - lo) / (hi - lo)) * 100).toFixed(1);
  const about = (profile?.description ?? '').split(/(?<=\.)\s+/).slice(0, 2).join(' ');

  return (
    <LiveProvider symbols={[symbol]}>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-grid">
        <div className="hero-copy pl-reveal">
          <Link className="back" href={m.id === 'xx' ? '/explorar' : `/mercado/${m.id}`}>← {m.id === 'xx' ? 'Explorar' : m.name}</Link>
          <span className="pl-eyebrow eyeflag"><Flag id={m.id} size="lg" />{symbol}{profile?.sector ? ` · ${profile.sector}` : crypto ? ' · criptomoneda' : ''} · {m.id === 'xx' ? profile?.country || 'Otros mercados' : m.name}</span>
          <h1 className="h1logo" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(42px,9vw,80px)', lineHeight: 0.92 }}>
            <Logo symbol={symbol} name={quote.name} website={profile?.website} crypto={crypto} size="lg" /><span>{profile?.name ?? quote.name}</span>
          </h1>
          <LivePrice symbol={symbol} price={quote.price} changePct={quote.changePct} currency={cur} />
          <div className="stock-actions"><FollowButton symbol={symbol} loggedIn={loggedIn} /><Link className="pl-link" href={`/cartera?agregar=${encodeURIComponent(symbol)}`}>Cargar en mi cartera</Link></div>
        </div>
        <PriceChart symbol={symbol} currency={cur} />
      </div></div></section>

      <main className="wrap">
        <section className="panel">
          <span className="pl-eyebrow">Explicado en simple</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, lineHeight: 1 }}>¿Por qué {up ? 'sube' : 'baja'} hoy?</h2>
          <Explain symbol={symbol} up={up} />
        </section>

        {!crypto && total > 0 && (
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Qué dicen los expertos</span><h2>La opinión de los analistas</h2></div>
            <div className="twocol">
              <div className="panel"><p className="say">De {total} analistas que siguen a {quote.name}, {verdict}.</p>
                <div className="votes">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < tenths ? 'y' : ''} />)}</div>
                <p className="src">{buy} dicen comprar · {grades!.hold} dicen esperar · {grades!.sell + grades!.strongSell} dicen vender</p></div>
              {tgt && upside != null && (
                <div className="panel"><p className="say">Creen que en un año podría valer <span className="pl-num" style={{ fontSize: '.8em' }}>{px(tgt)}</span>, {upside >= 0 ? <><mark className="pl-hl" style={{ animation: 'none', backgroundSize: '100% 64%' }}>{nf(0).format(upside * 100)}% más</mark> que hoy</> : <>un {nf(0).format(-upside * 100)}% menos que hoy</>}.</p>
                  <div className="target"><div className="rail2" /><div className="seg" style={{ left: `${Math.min(+pos(quote.price), +pos(tgt))}%`, width: `${Math.abs(+pos(tgt) - +pos(quote.price))}%` }} />
                    <div className="mk" style={{ left: `${pos(quote.price)}%` }}>Hoy<i style={{ background: 'var(--ink)' }} /></div><div className="mk" style={{ left: `${pos(tgt)}%` }}>Objetivo<i style={{ background: 'var(--up)' }} /></div></div></div>
              )}
            </div>
          </section>
        )}

        {crypto && (
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Antes de comprar cripto</span><h2>Lo que tenés que saber</h2></div>
            <div className="twocol">
              <div className="panel"><p className="say">No hay ganancias ni analistas que mirar: el precio depende de cuánta gente quiere comprarla.</p><p className="src">Por eso puede subir o bajar 10% en un día. Mucha gente limita la cripto a una parte chica de lo que invierte.</p></div>
              <div className="panel"><p className="say">Opera las 24 horas, todos los días.</p><p className="src">No cierra a la noche ni los fines de semana: el precio que ves cambia todo el tiempo.</p></div>
            </div>
          </section>
        )}

        <section className="sec facts"><div className="sechead"><span className="pl-eyebrow">Para los curiosos</span><h2>Datos clave, explicados</h2></div>
          <div className="pl-list">
            {quote.dayLow != null && quote.dayHigh != null && <div className="pl-row"><span className="k">Rango de hoy</span><span className="v">{px(quote.dayLow)} – {px(quote.dayHigh)}</span><span className="pl-meta" style={{ whiteSpace: 'normal' }}>Lo más bajo y lo más alto que tocó en el día.</span></div>}
            {quote.yearLow != null && quote.yearHigh != null && <div className="pl-row"><span className="k">Rango del último año</span><span className="v">{px(quote.yearLow)} – {px(quote.yearHigh)}</span><span className="pl-meta" style={{ whiteSpace: 'normal' }}>Te muestra si hoy está cerca de su piso o de su techo.</span></div>}
            {(quote.marketCap ?? profile?.marketCap) != null && <div className="pl-row"><span className="k">Valor de mercado</span><span className="v">{capUsd != null ? fmtCap(capUsd) : `${bigNum((quote.marketCap ?? profile?.marketCap)!)} (${cur})`}</span><span className="pl-meta" style={{ whiteSpace: 'normal' }}>{crypto ? 'Lo que valen juntas todas las monedas que existen.' : 'Lo que vale la empresa entera en la bolsa.'}</span></div>}
            {ratios?.pe != null && ratios.pe > 0 && <div className="pl-row"><span className="k">Precio / ganancia</span><span className="v">{nf(1).format(ratios.pe)} años</span><span className="pl-meta" style={{ whiteSpace: 'normal' }}>Cuántos años de ganancias pagás al comprarla. Menos suele ser más barato.</span></div>}
            {ratios?.dividendYield != null && ratios.dividendYield > 0 && <div className="pl-row"><span className="k">Dividendo</span><span className="v">{nf(1).format(ratios.dividendYield)}% al año</span><span className="pl-meta" style={{ whiteSpace: 'normal' }}>Lo que reparte por año a sus accionistas, sobre el precio de hoy.</span></div>}
            {quote.volume != null && <div className="pl-row"><span className="k">{crypto ? 'Operado hoy' : 'Acciones que cambiaron de mano'}</span><span className="v">{nf(1).format(quote.volume / 1e6)} M</span><span className="pl-meta" style={{ whiteSpace: 'normal' }}>Mucho movimiento indica interés o una noticia fuerte.</span></div>}
          </div>
          {about && <p className="note" style={{ maxWidth: '68ch' }}><b>De qué se trata.</b> {about}</p>}
        </section>
      </main>
    </LiveProvider>
  );
}
