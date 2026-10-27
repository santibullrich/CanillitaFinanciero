'use client';
import { createContext, useContext } from 'react';
import { fmtUsd } from '@/lib/format';

/** Tipos de cambio (dólares por unidad de cada moneda) para mostrar todos los precios en dólares. */
const FxCtx = createContext<Record<string, number>>({ USD: 1 });

export function FxProvider({ rates, children }: { rates: Record<string, number>; children: React.ReactNode }) {
  return <FxCtx.Provider value={rates}>{children}</FxCtx.Provider>;
}
export const useFx = (): Record<string, number> => useContext(FxCtx) as Record<string, number>;
/** Devuelve una función que formatea un precio en dólares (o en su moneda si no hay tipo de cambio). */
export function useUsd() {
  const fx = useFx();
  return (v: number | null | undefined, cur = 'USD') => fmtUsd(v, cur, fx);
}
