import Link from 'next/link';
import Flag from './Flag';
import Logo from './Logo';
import type { Candidate } from '@/lib/joyitas';
import { marketOfSymbol } from '@/lib/markets';
import { nf, symbolPath } from '@/lib/format';

/** Tarjeta de una joyita: potencial que ven los analistas y cuántos dicen comprar. */
export default function Gem({ c }: { c: Candidate }) {
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

