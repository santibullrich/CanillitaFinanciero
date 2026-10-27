'use client';
import Badge from './Badge';
import { useQuote } from './Live';
import { fmtPrice } from '@/lib/format';

export default function LivePrice({ symbol, price, changePct, currency }: { symbol: string; price: number; changePct: number; currency: string }) {
  const q = useQuote(symbol, { price, changePct });
  return (
    <div className="price-row">
      <span className="pl-num" style={{ fontSize: 40, lineHeight: '44px', fontWeight: 600, letterSpacing: '-.04em' }}>{fmtPrice(q.price, currency)}</span>
      <Badge c={q.changePct} lg />
    </div>
  );
}
