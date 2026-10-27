import Link from 'next/link';
import { notFound } from 'next/navigation';
import Badge from '@/components/Badge';
import { LiveProvider } from '@/components/Live';
import { StockList } from '@/components/StockRow';
import { getQuotes } from '@/lib/yahoo';
import { THEMES, themeById } from '@/lib/themes';
import { marketById, marketOfSymbol } from '@/lib/markets';

export const revalidate = 120;
export function generateStaticParams() { return THEMES.map((t) => ({ id: t.id })); }
const RISK = ['', 'muy bajo', 'bajo', 'medio', 'alto', 'muy alto'];

export default async function ThemePage({ params }: { params: { id: string } }) {
  const t = themeById(params.id);
  if (!t) notFound();
  const qs = (await getQuotes(t.symbols, 60).catch(() => [])).sort((a, b) => b.changePct - a.changePct);
  const avg = qs.length ? qs.reduce((a, q) => a + q.changePct, 0) / qs.length : 0;
  const ups = qs.filter((q) => q.changePct > 0).length;
  const rows = qs.map((q) => { const m = marketOfSymbol(q.symbol, q.exchange); return { symbol: q.symbol, name: q.name, price: q.price, changePct: q.changePct, market: m, currency: q.currency || marketById(m)?.currency || 'USD' }; });
  return (
    <LiveProvider symbols={t.symbols}>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-grid">
        <div className="hero-copy pl-reveal">
          <Link className="back" href="/#temas">← Temas</Link>
          <span className="pl-eyebrow">Tema · {qs.length} empresas</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(48px,11vw,92px)', lineHeight: 0.9 }}>{t.name}</h1>
          <p className="pl-lede">{t.desc}</p>
        </div>
        <div className="hero-board quiet">
          <span className="pl-eyebrow">Hoy en promedio</span>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 88, lineHeight: 0.86 }} className={avg >= 0 ? 'pl-up' : 'pl-down'}><Badge c={avg} lg /></div>
          <p>Riesgo {RISK[t.risk]}. {ups === qs.length ? 'Todas suben hoy.' : ups === 0 ? 'Hoy bajan todas.' : `De las ${qs.length} empresas, ${ups} suben hoy.`}</p>
        </div>
      </div></div></section>
      <main className="wrap">
        <section className="panel"><span className="pl-eyebrow">Qué tener en cuenta</span><p className="pl-lede" style={{ color: 'var(--ink)' }}>{t.note}</p></section>
        <section className="sec"><div className="sechead"><span className="pl-eyebrow">Ordenadas por cómo vienen hoy</span><h2>Las empresas</h2></div><StockList rows={rows} /></section>
      </main>
    </LiveProvider>
  );
}
