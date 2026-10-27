import Link from 'next/link';
import Flag from '@/components/Flag';
import { LiveProvider } from '@/components/Live';
import { StockList } from '@/components/StockRow';
import { explore, type ExploreSort } from '@/lib/data';
import { MARKETS } from '@/lib/markets';
import { SECTORS, sectorEs } from '@/lib/sectors';
import { nf } from '@/lib/format';
import DataNotice from '@/components/DataNotice';

export const metadata = { title: 'Explorar · CanillitaFinanciero' };
export const revalidate = 120;
export const maxDuration = 60;

const SORTS: { value: ExploreSort; label: string }[] = [
  { value: 'valor', label: 'Las más grandes primero' },
  { value: 'suben', label: 'Las que más suben hoy' },
  { value: 'bajan', label: 'Las que más bajan hoy' },
  { value: 'nombre', label: 'Por nombre (A-Z)' }
];

type SP = { m?: string; rubro?: string; orden?: string; p?: string };

export default async function Explorar({ searchParams }: { searchParams: SP }) {
  const sort = (SORTS.find((s) => s.value === searchParams.orden)?.value ?? 'valor') as ExploreSort;
  const sector = SECTORS.find((s) => s.value === searchParams.rubro)?.value;
  const res = await explore({ market: searchParams.m ?? 'us', sector, sort, page: Number(searchParams.p) || 1 });
  const m = res.market;
  const crypto = m.id === 'cr';
  const unit = crypto ? 'monedas' : 'acciones';
  const q = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const v = { m: m.id, rubro: sector, orden: sort === 'valor' ? undefined : sort, p: undefined as string | undefined, ...over };
    for (const [k, val] of Object.entries(v)) if (val) p.set(k, String(val));
    return `/explorar?${p.toString()}`;
  };
  const from = res.total ? (res.page - 1) * res.per + 1 : 0, to = Math.min(res.page * res.per, res.total);

  return (
    <LiveProvider symbols={res.rows.map((r) => r.symbol)}>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-copy pl-reveal" style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
        <span className="pl-eyebrow">Todas las acciones del mundo</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,84px)', lineHeight: 0.92 }}>Explorá</h1>
        <p className="pl-lede">Elegí un mercado y recorré todas sus {unit}. Podés filtrarlas por rubro y ordenarlas como quieras. Si ya sabés cuál buscás, usá el buscador de arriba.</p>
      </div></div></section>

      <main className="wrap">
        {!res.total && !sector && <DataNotice />}
        <section className="sec">
          <nav className="mkt-chips" aria-label="Mercados">
            {MARKETS.map((x) => (
              <Link key={x.id} href={`/explorar?m=${x.id}${sort !== 'valor' ? `&orden=${sort}` : ''}`} aria-current={x.id === m.id ? 'page' : undefined}><Flag id={x.id} />{x.name}</Link>
            ))}
          </nav>
          <form className="filters" action="/explorar" method="get">
            <input type="hidden" name="m" value={m.id} />
            {!crypto && (
              <label className="field"><span>Rubro</span>
                <select name="rubro" defaultValue={sector ?? ''}>
                  <option value="">Todos los rubros</option>
                  {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            )}
            <label className="field"><span>Orden</span>
              <select name="orden" defaultValue={sort}>{SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </label>
            <button className="pl-btn quiet" type="submit">Aplicar</button>
          </form>
          <p className="count">
            {res.total
              ? <>Mostrando {nf(0).format(from)}–{nf(0).format(to)} de <b>{nf(0).format(res.total)}</b> {unit} de {m.name}{sector ? ` · ${sectorEs(sector)}` : ''}</>
              : <>No encontramos {unit} con esos filtros. Probá con otro rubro o mercado.</>}
          </p>
          <StockList rows={res.rows} start={(res.page - 1) * res.per} />
          {res.pages > 1 && (
            <nav className="pager" aria-label="Páginas">
              {res.page > 1 ? <Link className="pl-btn quiet" href={q({ p: String(res.page - 1) })}>← Anteriores</Link> : <span />}
              <span className="pl-num">Página {res.page} de {nf(0).format(res.pages)}</span>
              {res.page < res.pages ? <Link className="pl-btn quiet" href={q({ p: String(res.page + 1) })}>Siguientes →</Link> : <span />}
            </nav>
          )}
          <p className="note">Incluye las {unit} con precio y valor de mercado informados por la bolsa. La lista completa se actualiza cada 15 minutos; los precios que ves arriba, cada 20 segundos.</p>
        </section>
      </main>
    </LiveProvider>
  );
}
