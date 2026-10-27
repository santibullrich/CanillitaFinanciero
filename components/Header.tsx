import Link from 'next/link';
import Search from './Search';
import ThemeToggle from './ThemeToggle';

export default function Header({ name }: { name: string | null }) {
  return (
    <header className="top">
      <div className="wrap mast">
        <Link className="pl-wordmark" href="/" aria-label="CanillitaFinanciero, inicio"><i /><span className="stack"><b>Canillita</b><span>Financiero</span></span></Link>
        <Search />
        <ThemeToggle />
        {name
          ? <Link className="acct" href="/cartera" aria-label="Mi cartera"><span className="av">{name.trim()[0]?.toUpperCase() || '?'}</span><span className="tl">Mi cartera</span></Link>
          : <Link className="acct" href="/ingresar">Ingresar</Link>}
      </div>
    </header>
  );
}
