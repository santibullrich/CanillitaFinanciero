'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type LiveQuote = { symbol: string; price: number; changePct: number; previousClose: number | null; name?: string; marketCap?: number | null };
type Ctx = { quotes: Record<string, LiveQuote>; fx: Record<string, number> | null };
const LiveCtx = createContext<Ctx>({ quotes: {}, fx: null });

/** Refresca precios cada 20 segundos para los símbolos que ve la página. */
export function LiveProvider({ symbols, withFx, children }: { symbols: string[]; withFx?: boolean; children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ quotes: {}, fx: null });
  const key = useMemo(() => Array.from(new Set(symbols)).sort().join(','), [symbols]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!key && !withFx) return;
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}${withFx ? '&fx=1' : ''}`);
        if (!r.ok) return;
        const j = await r.json();
        if (!alive) return;
        const map: Record<string, LiveQuote> = {};
        for (const q of j.quotes ?? []) map[q.symbol] = q;
        setState((s) => ({ quotes: { ...s.quotes, ...map }, fx: j.fx ?? s.fx }));
      } catch { /* sin conexión: se mantiene el último dato */ }
    };
    load();
    timer.current = setInterval(load, 20_000);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, [key, withFx]);
  return <LiveCtx.Provider value={state}>{children}</LiveCtx.Provider>;
}

export const useLive = () => useContext(LiveCtx);
export function useQuote<T extends { price: number; changePct: number }>(symbol: string, initial: T): T {
  const { quotes } = useLive();
  const q = quotes[symbol];
  return q ? { ...initial, price: q.price, changePct: q.changePct } : initial;
}
