import Link from 'next/link';
import { notFound } from 'next/navigation';
import Badge from '@/components/Badge';
import Flag from '@/components/Flag';
import PriceChart from '@/components/PriceChart';
import { LiveProvider } from '@/components/Live';
import { StockList, type RowData } from '@/components/StockRow';
import { marketSnapshotSafe, type Row } from '@/lib/data';
import DataNotice from '@/components/DataNotice';
import { MARKETS, isOpen, marketById } from '@/lib/markets';
import { fmtPct, mood, nf } from '@/lib/format';

export const revalidate = 120;
export const maxDuration = 60;
export function generateStaticParams() { return MARKETS.map((m) => ({ id: m.id })); }

const toRow = (q: Row): RowData => ({ symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct, market: q.market, currency: q.currency });

export default async function MarketPage({ params }: { params: { id: string } }) {
  const m = marketById(params.id);
  if (!m) notFound();
  const s = await marketSnapshotSafe(m.id);
  const index = s.index;
  const c = s.changePct;
  const r10 = s.count ? Math.round((s.ups / s.count) * 10) : 0;
  const best = s.gainers[0], worst = s.losers[0];
  const unit = m.id === 'cr' ? 'monedas' : 'acciones';
  const summary = s.ok
    ? `${m.nick} ${isOpen(m) ? 'viene' : 'cerró'} ${mood(c).verb}: de cada 10 ${unit}, ${r10} ${isOpen(m) ? 'suben' : 'subieron'}.` +
      (best ? ` La figura del día es ${best.name} (${fmtPct(best.changePct)})` : '') + (worst ? `, y a ${worst.name} le toca el peor día (${fmtPct(worst.changePct)}).` : '.')
    : 'Todavía no tenemos datos de este mercado. Probá en unos minutos.';
  const live = [...s.gainers, ...s.losers, ...s.largest].map((q) => q.symbol);

  return (
    <LiveProvider symbols={live}>
      {!s.ok && !s.index && <DataNotice />}
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-grid">
        <div className="hero-copy pl-reveal">
          <Link className="back" href="/">← Volver al mundo</Link>
          <span className="pl-eyebrow eyeflag"><Flag id={m.id} size="lg" />{m.nick} · {m.indexName} · {m.id === 'cr' ? 'abierto 24/7' : isOpen(m) ? 'abierto ahora' : 'cerrado'}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(52px,12vw,96px)', lineHeight: 0.9 }}>{m.name}</h1>
          <div className="price-row">{index && <span className="pl-num" style={{ fontSize: 30, fontWeight: 600 }}>{nf(index.price > 9999 ? 0 : 2).format(index.price)}</span>}<Badge c={c} lg /><span className="mood">{mood(c).word}</span></div>
          <p className="pl-lede">{summary}</p>
          <p className="pl-lede" style={{ fontSize: 16 }}>{m.context}</p>
        </div>
        <PriceChart symbol={m.index} />
      </div></div></section>
      <main className="wrap">
        <div className="pair">
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Subas del día</span><h2>Las que más suben</h2></div><StockList rows={s.gainers.map(toRow)} empty="Hoy ninguna sube." /></section>
          <section className="sec"><div className="sechead"><span className="pl-eyebrow">Bajas del día</span><h2>Las que más bajan</h2></div><StockList rows={s.losers.map(toRow)} empty="Hoy ninguna baja." /></section>
        </div>
        <hr className="rule" />
        <section className="sec"><div className="sechead"><span className="pl-eyebrow">Las que más pesan</span><h2>{m.id === 'cr' ? 'Las monedas más grandes' : 'Las empresas más grandes'}</h2></div>
          <StockList rows={s.largest.map(toRow)} ranked />
          {s.count > s.largest.length && <div><Link className="pl-btn primary" href={`/explorar?m=${m.id}`}>Ver las {s.count} principales {unit} de {m.name}</Link></div>}
        </section>
      </main>
    </LiveProvider>
  );
}
