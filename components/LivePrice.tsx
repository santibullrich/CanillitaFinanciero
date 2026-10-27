'use client';
import Badge from './Badge';
import { useQuote } from './Live';
import { fmtPrice } from '@/lib/format';
import { useFx, useUsd } from './Fx';

export default function LivePrice({ symbol, price, changePct, currency }: { symbol: string; price: number; changePct: number; currency: string }) {
  const q = useQuote(symbol, { price, changePct });
  const usd = useUsd();
  const fx = useFx();
  const local = currency !== 'USD' && !!fx[currency];
  return (
    <div className="price-row">
      <span className="pl-num" style={{ fontSize: 40, lineHeight: '44px', fontWeight: 600, letterSpacing: '-.04em' }}>{usd(q.price, currency)}</span>
      <Badge c={q.changePct} lg />
      {local ? <span className="pl-meta" style={{ width: '100%' }}>En su bolsa: {fmtPrice(q.price, currency)}</span> : null}
    </div>
  );
}
