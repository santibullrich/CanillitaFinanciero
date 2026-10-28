import Link from 'next/link';
import Badge from '@/components/Badge';
import Logo from '@/components/Logo';
import { getQuotes } from '@/lib/yahoo';
import { marketMood, PHASE_ES, politicians, screen, sentiEnabled, tracker, type ScreenRow, type TrackerRow } from '@/lib/sentisense';
import { cryptoFearGreed, FNG_ES, trendingCoins } from '@/lib/cryptoSocial';
import { nf, symbolPath } from '@/lib/format';

export const revalidate = 3600;
export const maxDuration = 60;
export const metadata = { title: 'Redes · CanillitaFinanciero' };

const tone = (s: number | null) => (s == null ? { t: 'Sin datos', k: 'flat' } : s > 13 ? { t: 'Muy optimista', k: 'up' } : s > 5 ? { t: 'Optimista', k: 'up' } : s < -13 ? { t: 'Muy pesimista', k: 'down' } : s < -5 ? { t: 'Pesimista', k: 'down' } : { t: 'Neutral', k: 'flat' });
const PARTY: Record<string, string> = { Democrat: 'Demócrata', Republican: 'Republicano', Independent: 'Independiente', D: 'Demócrata', R: 'Republicano', I: 'Independiente' };
const CHAMBER: Record<string, string> = { House: 'Diputados', Senate: 'Senado', house: 'Diputados', senate: 'Senado' };
const TX: Record<string, string> = { PURCHASE: 'Compró', SALE: 'Vendió', EXCHANGE: 'Canjeó', OTHER: 'Operó' };
const LABEL: Record<string, string> = { Return: 'Rendimiento', 'Return since entry': 'Desde que la eligieron', 'vs SPY': 'Contra el S&P 500', Mentions: 'Menciones', Sentiment: 'Sentimiento', Price: 'Precio', Entry: 'Entrada', 'Entry date': 'Desde', Status: 'Estado' };
const fecha = (s: string) => (s ? new Date(s + (s.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '');

function metric(m: TrackerRow['metrics'][number]) {
  const v = m.value;
  if (typeof v === 'number') return m.unit === 'percent' ? `${v > 0 ? '+' : ''}${nf(1).format(v)}%` : m.unit === 'usd' ? `US$ ${nf(2).format(v)}` : nf(v % 1 ? 2 : 0).format(v);
  if (Array.isArray(v) || (v && typeof v === 'object')) return '';
  return String(v ?? '');
}

function Gauge({ title, value, label, note }: { title: string; value: number | null; label: string; note: string }) {
  const k = value == null ? 'flat' : value >= 55 ? 'up' : value <= 45 ? 'down' : 'flat';
  return (
    <div className="panel gauge">
      <span className="pl-eyebrow">{title}</span>
      <div className="gnum"><b className={`pl-num pl-${k}`}>{value == null ? '—' : Math.round(value)}</b><span>{label}</span></div>
      <div className="gbar" aria-hidden="true"><i style={{ left: `${Math.max(0, Math.min(100, value ?? 50))}%` }} /></div>
      <div className="gscale"><span>Pánico</span><span>Euforia</span></div>
      <p className="src">{note}</p>
    </div>
  );
}

export default async function Redes() {
  const on = sentiEnabled();
  const [talked, bulls, bears, reddit, pol, mood, coins, fng] = await Promise.all([
    screen({ filters: [{ fieldName: 'MARKET_CAP', op: 'GTE', value: 1e9 }], sort: { fieldName: 'SOCIAL_DOMINANCE', dir: 'DESC' } }, 10),
    screen({ filters: [{ fieldName: 'MARKET_CAP', op: 'GTE', value: 10e9 }], sort: { fieldName: 'SENTI_SCORE_7D', dir: 'DESC' } }, 6),
    screen({ filters: [{ fieldName: 'MARKET_CAP', op: 'GTE', value: 10e9 }], sort: { fieldName: 'SENTI_SCORE_7D', dir: 'ASC' } }, 6),
    tracker('reddit-picks'), politicians(), marketMood(), trendingCoins(), cryptoFearGreed()
  ]);
  const tickers = Array.from(new Set([...(talked?.rows ?? []), ...(bulls?.rows ?? []), ...(bears?.rows ?? [])].map((r) => r.ticker).concat((reddit?.rows ?? []).map((r) => r.ticker!).filter(Boolean))));
  const qs = tickers.length ? await getQuotes(tickers, 600).catch(() => []) : [];
  const q = new Map(qs.map((x) => [x.symbol, x] as const));
  const nameOf = (t: string, fallback?: string) => q.get(t)?.name ?? fallback ?? t;

  const Row = ({ r, rank, share }: { r: ScreenRow; rank: number; share?: boolean }) => {
    const tn = tone(r.sentiSenseScore7D);
    const ch = q.get(r.ticker)?.changePct ?? r.changePercent;
    return (
      <Link className="pl-row" href={symbolPath(r.ticker)}>
        <span className="pl-rank">{String(rank).padStart(2, '0')}</span>
        <span className="pl-name"><Logo symbol={r.ticker} name={nameOf(r.ticker, r.name)} />{nameOf(r.ticker, r.name)}</span>
        <span className="pl-side">{ch != null && <Badge c={ch} />}</span>
        <span className="pl-meta">{r.ticker} · <span className={`pl-${tn.k}`}>{tn.t}</span>{share && r.socialDominance != null ? ` · ${nf(1).format(r.socialDominance * 100)}% de la charla` : ''}{r.mentionVelocity != null && Math.abs(r.mentionVelocity) >= 50 ? ` · menciones ${r.mentionVelocity > 0 ? '+' : ''}${nf(0).format(r.mentionVelocity)}%` : ''}</span>
      </Link>
    );
  };

  return (
    <>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-copy pl-reveal" style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
        <Link className="back" href="/">← Inicio</Link><span className="pl-eyebrow">Lo que dice la gente</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,84px)', lineHeight: 0.92 }}>El <mark className="pl-hl">termómetro</mark> de las redes</h1>
        <p className="pl-lede">De qué acciones y criptos se habla en Reddit, X, YouTube y los diarios, si se habla bien o mal, qué eligen los inversores de Reddit y en qué invierten los políticos de Estados Unidos.</p>
      </div></div></section>

      <main className="wrap">
        <section className="sec">
          <div className="gauges">
            <Gauge title="Humor de la bolsa" value={mood?.score ?? null} label={mood ? PHASE_ES[mood.phase] ?? mood.phase : 'Sin datos'} note={mood?.weeklyChange != null ? `${mood.weeklyChange >= 0 ? 'Subió' : 'Bajó'} ${nf(0).format(Math.abs(mood.weeklyChange))} puntos en la semana.` : 'Mezcla volatilidad, tendencia y sentimiento.'} />
            <Gauge title="Humor cripto" value={fng?.value ?? null} label={fng ? FNG_ES[fng.label] ?? fng.label : 'Sin datos'} note={fng?.weekAgo != null ? `Hace una semana estaba en ${fng.weekAgo}.` : 'Índice de miedo y codicia del mercado cripto.'} />
          </div>
        </section>

        {!on && <p className="note">Para ver el sentimiento de acciones, Reddit y políticos falta conectar SentiSense (variable SENTISENSE_API_KEY en Vercel).</p>}

        {talked?.rows.length ? (
          <section className="sec">
            <div className="sechead"><span className="pl-eyebrow">Lo más hablado</span><h2>Las acciones de las que todos hablan</h2><p>Las que más lugar ocupan en la conversación de esta semana en redes y medios, y en qué tono.</p></div>
            <div className="pl-list">{talked.rows.map((r, i) => <Row key={r.ticker} r={r} rank={i + 1} share />)}</div>
          </section>
        ) : null}

        {(bulls?.rows.length || bears?.rows.length) ? (
          <section className="sec">
            <div className="sechead"><span className="pl-eyebrow">Optimistas y pesimistas</span><h2>Las más queridas y las más castigadas</h2><p>Empresas grandes donde la charla de los últimos 7 días es más optimista y más pesimista.</p></div>
            <div className="twocol">
              <div><h3 className="minih pl-up">Se habla bien</h3><div className="pl-list">{(bulls?.rows ?? []).map((r, i) => <Row key={r.ticker} r={r} rank={i + 1} />)}</div></div>
              <div><h3 className="minih pl-down">Se habla mal</h3><div className="pl-list">{(bears?.rows ?? []).map((r, i) => <Row key={r.ticker} r={r} rank={i + 1} />)}</div></div>
            </div>
          </section>
        ) : null}

        {reddit?.rows.length ? (
          <section className="sec">
            <div className="sechead"><span className="pl-eyebrow">Reddit</span><h2>Lo que eligen en Reddit</h2><p>Acciones que los foros de inversión de Reddit empezaron a recomendar, y cómo les fue desde entonces comparadas con el S&P 500.</p></div>
            <div className="pl-list">
              {reddit.rows.slice(0, 10).map((r) => {
                const ms = r.metrics.map((m) => ({ l: LABEL[m.label] ?? m.label, v: metric(m) })).filter((m) => m.v).slice(0, 3);
                const inner = (<>
                  <span className="pl-rank">{String(r.rank).padStart(2, '0')}</span>
                  <span className="pl-name">{r.ticker && <Logo symbol={r.ticker} name={nameOf(r.ticker, r.name)} />}{r.ticker ? nameOf(r.ticker, r.name) : r.name}</span>
                  <span className="pl-side" />
                  <span className="pl-meta">{[r.ticker, ...ms.map((m) => `${m.l}: ${m.v}`)].filter(Boolean).join(' · ')}</span>
                </>);
                return r.ticker ? <Link className="pl-row" key={r.rank} href={symbolPath(r.ticker)}>{inner}</Link> : <div className="pl-row" key={r.rank}>{inner}</div>;
              })}
            </div>
          </section>
        ) : null}

        {pol && (pol.trades.length || pol.members.length) ? (
          <section className="sec">
            <div className="sechead"><span className="pl-eyebrow">Políticos de EE.UU.</span><h2>En qué invierten los congresistas</h2><p>Por ley, diputados y senadores de Estados Unidos tienen que declarar sus compras y ventas de acciones dentro de los 45 días. Estas son las últimas que se hicieron públicas.</p></div>
            <div className="twocol">
              <div className="pl-list">
                {pol.trades.map((t, i) => {
                  const inner = (<>
                    <span className="pl-rank">{t.transactionType === 'PURCHASE' ? '▲' : t.transactionType === 'SALE' ? '▼' : '•'}</span>
                    <span className="pl-name">{t.politicianName}</span>
                    <span className={`pl-side pl-${t.transactionType === 'PURCHASE' ? 'up' : t.transactionType === 'SALE' ? 'down' : 'flat'}`} style={{ fontWeight: 600, fontSize: 14 }}>{TX[t.transactionType] ?? 'Operó'} {t.ticker ?? ''}</span>
                    <span className="pl-meta">{[PARTY[t.party] ?? t.party, CHAMBER[t.chamber] ?? t.chamber, t.state].filter(Boolean).join(' · ')} · {t.amountRange ? `entre ${t.amountRange.replace(/\s*-\s*/, ' y ')}` : ''} · {fecha(t.transactionDate)}</span>
                  </>);
                  return t.ticker ? <Link className="pl-row" key={i} href={symbolPath(t.ticker)}>{inner}</Link> : <div className="pl-row" key={i}>{inner}</div>;
                })}
              </div>
              {pol.members.length > 0 && (
                <div className="panel">
                  <h3 className="minih">Los que más operan</h3>
                  <ul className="srclist" style={{ gap: 10 }}>
                    {pol.members.map((m) => <li key={m.displayName}><b>{m.displayName}</b> <span>· {[PARTY[m.party] ?? m.party, CHAMBER[m.chamber] ?? m.chamber].filter(Boolean).join(', ')} · {m.tradeCount ?? '—'} operaciones{m.purchases != null && m.sales != null ? ` (${m.purchases} compras, ${m.sales} ventas)` : ''}</span></li>)}
                  </ul>
                </div>
              )}
            </div>
            {pol.preview && pol.totalTrades > pol.trades.length && <p className="note">Mostramos las {pol.trades.length} más recientes de {pol.totalTrades} operaciones declaradas en los últimos 60 días.</p>}
          </section>
        ) : null}

        {coins.length > 0 && (
          <section className="sec">
            <div className="sechead"><span className="pl-eyebrow">Cripto</span><h2>Las criptos del momento</h2><p>Las más buscadas hoy y qué porcentaje de su comunidad cree que van a subir.</p></div>
            <div className="pl-list">
              {coins.map((c, i) => (
                <Link className="pl-row" key={c.symbol} href={symbolPath(`${c.symbol}-USD`)}>
                  <span className="pl-rank">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pl-name"><Logo symbol={`${c.symbol}-USD`} name={c.name} crypto />{c.name}</span>
                  <span className="pl-side">{c.changePct != null && <Badge c={c.changePct} />}</span>
                  <span className="pl-meta">{c.symbol}{c.rank ? ` · puesto ${c.rank} en tamaño` : ''}{c.bullishPct != null ? ` · ${nf(0).format(c.bullishPct)}% de la comunidad cree que sube` : ''}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="note">Fuentes: SentiSense (sentimiento en Reddit, X, YouTube, Substack y noticias; operaciones del Congreso de EE.UU.), CoinGecko y alternative.me. Lo que se dice en redes no es un consejo de inversión: muchas veces la multitud se equivoca.</p>
      </main>
    </>
  );
}
