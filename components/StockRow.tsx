'use client';
import Link from 'next/link';
import Badge from './Badge';
import Flag from './Flag';
import Logo from './Logo';
import { useQuote } from './Live';
import { fmtPrice, symbolPath } from '@/lib/format';
import { marketById } from '@/lib/markets';

export type RowData = { symbol: string; name: string; price: number; changePct: number; market: string; currency: string; note?: string };

export default function StockRow({ row, rank }: { row: RowData; rank?: number }) {
  const q = useQuote(row.symbol, row);
  const m = marketById(row.market);
  return (
    <Link className="pl-row" href={symbolPath(row.symbol)}>
      <span className="pl-rank">{rank != null ? String(rank + 1).padStart(2, '0') : ''}</span>
      <span className="pl-name"><Logo symbol={row.symbol} name={row.name} crypto={row.market === 'cr'} />{row.name}</span>
      <span className="pl-side"><Badge c={q.changePct} /></span>
      <span className="pl-meta"><Flag id={row.market} />{m?.name ?? ''} · <span className="pl-num">{fmtPrice(q.price, row.currency)}</span>{row.note ? ` · ${row.note}` : ''}</span>
    </Link>
  );
}

export function StockList({ rows, ranked = true, empty }: { rows: RowData[]; ranked?: boolean; empty?: string }) {
  if (!rows.length) return <p className="note">{empty ?? 'Sin datos por ahora.'}</p>;
  return <div className="pl-list">{rows.map((r, i) => <StockRow key={r.symbol} row={r} rank={ranked ? i : undefined} />)}</div>;
}
