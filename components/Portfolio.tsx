'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Advisor from './Advisor';
import Badge from './Badge';
import Flag from './Flag';
import Logo from './Logo';
import Search from './Search';
import { supabaseBrowser } from '@/lib/supabase/client';
import { dir, fmtPct, fmtPrice, nf, symbolPath, usd, usdSigned, SYM } from '@/lib/format';
import { marketOfSymbol } from '@/lib/markets';
import { RISK_LEVELS } from '@/lib/sectors';

type Position = { id: string; symbol: string; name: string | null; currency: string; quantity: number; buy_price: number; bought_at: string };
type Q = { symbol: string; name: string; price: number; changePct: number; previousClose: number | null; exchange: string };
type Picked = { symbol: string; name: string; market: string; currency: string };

const ARROW = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default function Portfolio({ userId, nombre, preset }: { userId: string; nombre: string; preset?: string }) {
  const sb = supabaseBrowser();
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [watch, setWatch] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Q>>({});
  const [fx, setFx] = useState<Record<string, number>>({ USD: 1 });
  const [picked, setPicked] = useState<Picked | null>(null);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [formErr, setFormErr] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, { sector: string; risk: string; crypto: boolean }>>({});

  const load = useCallback(async () => {
    const [p, w] = await Promise.all([
      sb.from('positions').select('id,symbol,name,currency,quantity,buy_price,bought_at').order('created_at'),
      sb.from('watchlist').select('symbol').order('created_at')
    ]);
    if (p.error) setLoadErr('No pudimos leer tu cartera. Recargá la página.');
    setPositions((p.data ?? []).map((r: any) => ({ ...r, quantity: Number(r.quantity), buy_price: Number(r.buy_price) })));
    setWatch((w.data ?? []).map((r: any) => r.symbol));
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  const symbols = useMemo(() => Array.from(new Set([...(positions ?? []).map((p) => p.symbol), ...watch])), [positions, watch]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/quotes?fx=1&symbols=${encodeURIComponent(symbols.join(','))}`);
        const j = await r.json();
        if (!alive) return;
        const map: Record<string, Q> = {};
        for (const q of j.quotes ?? []) map[q.symbol] = q;
        setQuotes((s) => ({ ...s, ...map }));
        if (j.fx) setFx(j.fx);
      } catch { /* mantiene el último dato */ }
    };
    refresh();
    const t = setInterval(refresh, 20_000);
    return () => { alive = false; clearInterval(t); };
  }, [symbols]);

  const held = useMemo(() => Array.from(new Set((positions ?? []).map((p) => p.symbol))).sort().join(','), [positions]);
  useEffect(() => {
    if (!held) return;
    fetch(`/api/profiles?symbols=${encodeURIComponent(held)}`).then((r) => r.json()).then((j) => setMeta((m) => ({ ...m, ...j }))).catch(() => {});
  }, [held]);

  const pick = useCallback(async (h: { symbol: string; name: string; market?: string; currency?: string }) => {
    const market = h.market ?? marketOfSymbol(h.symbol);
    setPicked({ symbol: h.symbol, name: h.name, market, currency: market === 'cr' ? 'USD' : h.currency || 'USD' });
    setFormErr('');
    try {
      const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(h.symbol)}`);
      const j = await r.json();
      const q = (j.quotes ?? [])[0];
      if (q?.price) setPrice(String(q.price < 10 ? Number(q.price.toFixed(4)) : Number(q.price.toFixed(2))));
    } catch { /* el usuario lo escribe */ }
  }, []);

  useEffect(() => {
    if (!preset) return;
    fetch(`/api/search?q=${encodeURIComponent(preset)}`).then((r) => r.json()).then((j) => {
      const h = (j.results ?? []).find((x: any) => x.symbol.toUpperCase() === preset.toUpperCase());
      if (h) { pick(h); setTimeout(() => document.getElementById('cargar')?.scrollIntoView({ behavior: 'smooth' }), 300); }
    }).catch(() => {});
  }, [preset, pick]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty.replace(',', '.')), p = parseFloat(price.replace(',', '.'));
    if (!picked) return setFormErr('Buscá y elegí una acción o cripto.');
    if (!(q > 0)) return setFormErr('Poné cuántas tenés (un número mayor a cero).');
    if (!(p > 0)) return setFormErr('Poné el precio al que compraste (mayor a cero).');
    const { error } = await sb.from('positions').insert({ user_id: userId, symbol: picked.symbol, name: picked.name, currency: picked.currency, quantity: q, buy_price: p });
    if (error) return setFormErr('No pudimos guardar la posición. Probá de nuevo.');
    setQty(''); setPicked(null); setPrice('');
    load();
  };

  const remove = async (id: string) => {
    if (confirm !== id) return setConfirm(id);
    setConfirm(null);
    const { error } = await sb.from('positions').delete().eq('id', id);
    if (!error) setPositions((ps) => (ps ?? []).filter((p) => p.id !== id));
  };

  const calc = useMemo(() => {
    let val = 0, cost = 0, day = 0;
    const byType: Record<string, number> = { Acciones: 0, Cripto: 0 }, byRisk: Record<string, number> = {}, bySec: Record<string, number> = {};
    const rows = (positions ?? []).map((p) => {
      const q = quotes[p.symbol];
      const rate = fx[p.currency] ?? 1;
      const px = q?.price ?? p.buy_price;
      const prev = q?.previousClose ?? (q ? q.price / (1 + q.changePct / 100) : px);
      const v = p.quantity * px * rate, c = p.quantity * p.buy_price * rate, d = p.quantity * (px - prev) * rate;
      val += v; cost += c; day += d;
      const m = marketOfSymbol(p.symbol, q?.exchange);
      const info = meta[p.symbol];
      const crypto = info?.crypto ?? m === 'cr';
      byType[crypto ? 'Cripto' : 'Acciones'] += v;
      const rk = info?.risk ?? (crypto ? 'Muy alto' : 'Medio');
      byRisk[rk] = (byRisk[rk] ?? 0) + v;
      const sec = info?.sector ?? (crypto ? 'Cripto' : 'Sin rubro');
      bySec[sec] = (bySec[sec] ?? 0) + v;
      return { p, q, v, c, d, m, pnl: v - c, pct: c ? ((v - c) / c) * 100 : 0, live: !!q };
    });
    return { rows, val, cost, day, byType, byRisk, bySec, pnl: val - cost, pct: cost ? ((val - cost) / cost) * 100 : 0, dpct: val - day > 0 ? (day / (val - day)) * 100 : 0 };
  }, [positions, quotes, fx, meta]);

  return (
    <>
      <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-copy pl-reveal" style={{ maxWidth: 1140, margin: '0 auto', width: '100%' }}>
        <span className="pl-eyebrow">Hola, {nombre}</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,84px)', lineHeight: 0.92 }}>Tu cartera</h1>
        <div className="pf-sum">
          <div className="stat"><span>Valor de tu cartera</span><b className="pl-num">{usd(calc.val)}</b></div>
          <div className="stat"><span>Ganancia total</span><b className={`pl-num pl-${dir(calc.pnl)}`}>{usdSigned(calc.pnl)}</b><small className={`pl-${dir(calc.pnl)}`}>{fmtPct(calc.pct)}</small></div>
          <div className="stat"><span>Hoy</span><b className={`pl-num pl-${dir(calc.day)}`}>{usdSigned(calc.day)}</b><small className={`pl-${dir(calc.day)}`}>{fmtPct(calc.dpct)}</small></div>
        </div>
      </div></div></section>

      <main className="wrap">
        {loadErr && <p className="err" role="alert">{loadErr}</p>}
        <section className="sec">
          <div className="sechead"><span className="pl-eyebrow">En dólares, con precios en vivo</span><h2>Tus posiciones</h2></div>
          {positions === null ? <p className="note">Cargando tu cartera…</p> : calc.rows.length ? (
            <div className="pl-list">
              {calc.rows.map((r) => (
                <div className="pf-row" key={r.p.id}>
                  <Link className="who" href={symbolPath(r.p.symbol)}><Logo symbol={r.p.symbol} name={r.p.name ?? r.p.symbol} crypto={r.m === 'cr'} />
                    <span><span className="pl-name">{r.p.name ?? r.p.symbol}</span><span className="pl-meta"><Flag id={r.m} />{nf(r.p.quantity % 1 ? 4 : 0).format(r.p.quantity)} × compraste a {fx[r.p.currency] && r.p.currency !== 'USD' ? fmtPrice(r.p.buy_price * fx[r.p.currency], 'USD') : fmtPrice(r.p.buy_price, r.p.currency)}</span></span>
                  </Link>
                  <div className="right"><b className="pl-num">{usd(r.v)}</b><span className={`pl-num pl-${dir(r.pnl)}`}>{usdSigned(r.pnl)} · {fmtPct(r.pct)}</span></div>
                  <div className="day"><span>Hoy <b className={`pl-num pl-${dir(r.d)}`}>{usdSigned(r.d)}</b>{!r.live && ' · sin precio en vivo'}</span>
                    <button type="button" className={`pf-del${confirm === r.p.id ? ' sure' : ''}`} onClick={() => remove(r.p.id)}>{confirm === r.p.id ? '¿Seguro? Sí, quitar' : 'Quitar'}</button></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel empty"><p className="say">Todavía no cargaste posiciones.</p><p className="src">Abajo buscás una acción o cripto de cualquier bolsa del mundo, ponés cuántas tenés y a qué precio las compraste.</p></div>
          )}
          {calc.rows.length > 0 && calc.val > 0 && (() => {
            const pct = (v: number) => (v / calc.val) * 100;
            const bars = (obj: Record<string, number>, order?: readonly string[]) =>
              (order ? [...order] : Object.keys(obj).sort((a, b) => obj[b] - obj[a])).filter((k) => (obj[k] ?? 0) > 0).map((k) => (
                <div className="arow" key={k}><span>{k}</span><span className="track"><i style={{ width: `${pct(obj[k])}%` }} /></span><b className="pl-num">{nf(0).format(pct(obj[k]))}%</b></div>
              ));
            const st = pct(calc.byType.Acciones), cr = pct(calc.byType.Cripto);
            return (
              <div className="alloc3">
                <div className="alloc"><span className="pl-eyebrow">Acciones y cripto</span>
                  <div className="split-bar" role="img" aria-label={`${nf(0).format(st)}% en acciones y ${nf(0).format(cr)}% en cripto`}><i className="st" style={{ width: `${st}%` }} /><i className="cr" style={{ width: `${cr}%` }} /></div>
                  <div className="split-leg"><span><i className="st" />Acciones <b className="pl-num">{nf(0).format(st)}%</b></span><span><i className="cr" />Cripto <b className="pl-num">{nf(0).format(cr)}%</b></span></div>
                </div>
                <div className="alloc"><span className="pl-eyebrow">Por nivel de riesgo</span>{bars(calc.byRisk, RISK_LEVELS)}<p className="note">Según cuánto se mueve cada acción comparada con el mercado. Toda la cripto cuenta como riesgo muy alto.</p></div>
                <div className="alloc"><span className="pl-eyebrow">Por rubro</span>{bars(calc.bySec)}</div>
              </div>
            );
          })()}
        </section>

        <section className="sec" id="cargar">
          <div className="sechead"><span className="pl-eyebrow">Sumá lo que compraste</span><h2>Cargar una posición</h2><p>Buscá la acción o la cripto, poné cuántas tenés y a qué precio las compraste (en su moneda).</p></div>
          <form className="panel pf-form" onSubmit={add} noValidate>
            <div className="field"><span>Acción o cripto</span>
              {picked
                ? <div className="picked"><Logo symbol={picked.symbol} name={picked.name} crypto={picked.market === 'cr'} /><b>{picked.name}</b><span className="pl-meta">{picked.symbol}</span><button type="button" className="pf-del" onClick={() => { setPicked(null); setPrice(''); }}>Cambiar</button></div>
                : <Search compact onPick={(h: any) => pick(h)} placeholder="Buscá por nombre o ticker" />}
            </div>
            <div className="row2">
              <label className="field"><span>Cantidad</span><input inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value); setFormErr(''); }} placeholder="10" /></label>
              <label className="field"><span>Precio de compra {picked && <em>en {SYM[picked.currency] ?? picked.currency}</em>}</span><input inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setFormErr(''); }} /></label>
            </div>
            {formErr && <p className="err" role="alert">{formErr}</p>}
            <div><button className="pl-btn primary" type="submit">Agregar a mi cartera{ARROW}</button></div>
          </form>
        </section>

        <section className="sec" id="asesor">
          <div className="sechead"><span className="pl-eyebrow">Asesor con IA</span><h2>¿Cómo mejoro mi cartera?</h2><p>El asesor busca los puntos débiles de tu cartera y te propone tres formas de rotarla (conservadora, moderada y arriesgada), con fundamentos y análisis técnico de cada acción.</p></div>
          <Advisor hasPositions={calc.rows.length > 0} />
        </section>

        <section className="sec">
          <div className="sechead"><span className="pl-eyebrow">Tu lista de seguimiento</span><h2>Las que seguís</h2></div>
          {watch.length ? (
            <div className="pl-list">
              {watch.map((s) => { const q = quotes[s]; const m = marketOfSymbol(s, q?.exchange); return (
                <Link className="pl-row" key={s} href={symbolPath(s)}><span className="pl-rank" /><span className="pl-name"><Logo symbol={s} name={q?.name ?? s} crypto={m === 'cr'} />{q?.name ?? s}</span>
                  <span className="pl-side">{q ? <Badge c={q.changePct} /> : null}</span><span className="pl-meta"><Flag id={m} />{s}{q ? ` · ${nf(q.price < 1 ? 4 : 2).format(q.price)}` : ''}</span></Link>); })}
            </div>
          ) : <p className="note">Todavía no seguís ninguna. Entrá a una empresa o moneda y tocá “Seguir”.</p>}
        </section>

        <form action="/auth/salir" method="post"><button className="pl-btn quiet" type="submit">Cerrar sesión</button></form>
      </main>
    </>
  );
}
