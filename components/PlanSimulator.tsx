'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ASSET_CLASS, CATEGORIES, PORTFOLIOS, PROFILE_CAP, PROJECTION_CAP, RISK_LABEL, type Asset } from '@/lib/assets';

const CLASS_COLOR: Record<string, string> = { bonos: 'var(--celeste)', eeuu: 'var(--ink)', mundo: 'var(--celeste-ink)', oro: 'var(--resaltador)', inmuebles: '#B08B5A', materias: '#8A6F2E', empresa: 'var(--up)', cripto: 'var(--down)' };

type Mix = { ticker: string; pct: number; por_que: string };
type Plan = { perfil: keyof typeof PROFILE_CAP; objetivo_usd: number | null; mensual_usd: number | null; resumen: string; consejo: string; mix: Mix[]; ai: boolean };

const money = (v: number) => 'US$ ' + Math.round(v).toLocaleString('es-AR');
const fv = (rate: number, m: number, n: number) => { const i = Math.pow(1 + rate / 100, 1 / 12) - 1; return i ? (m * (Math.pow(1 + i, n) - 1)) / i : m * n; };
const COLORS: Record<string, string> = { etf: 'var(--celeste)', stock: 'var(--down)', crypto: 'var(--resaltador)' };
const EXAMPLES = [
  ['Conservador, 1 millón', 'Soy un inversor conservador, quiero juntar 1 millón de dólares y puedo poner 500 dólares por mes. ¿Qué me conviene?'],
  ['Arriesgado, 300 mil', 'Tengo 25 años, me la juego, puedo poner 200 dólares por mes y quiero llegar a 300 mil dólares.'],
  ['Un auto en pocos años', 'Quiero juntar 50 mil dólares para comprarme un auto poniendo 400 dólares por mes.']
];
const ARROW = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const TRASH = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>;
const KEY = 'canillita-sim-v1';

type Hit = { symbol: string; name: string; exchange?: string; market?: string };

export default function PlanSimulator({ assets }: { assets: Asset[] }) {
  const [extra, setExtra] = useState<Asset[]>([]);
  const A = useMemo(() => Object.fromEntries([...assets, ...extra].map((a) => [a.t, a])), [assets, extra]);
  const [cat, setCat] = useState<string>('medio');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchMsg, setSearchMsg] = useState('');
  const [sel, setSel] = useState<Record<string, number>>({ SPY: 150, 'BTC-USD': 30 });
  const [order, setOrder] = useState<string[]>(['SPY', 'BTC-USD']);
  const [years, setYears] = useState(15);
  const [text, setText] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);
  const simRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.order?.length) { setSel(s.sel); setOrder(s.order); setYears(s.years || 15); if (Array.isArray(s.extra)) setExtra(s.extra); } } catch { /* sin guardado */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify({ sel, order, years, extra })); } catch { /* sin guardado */ } }, [sel, order, years, extra]);

  /* ---------- Buscador: cualquier acción, ETF o cripto ---------- */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try { const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal }); const j = await r.json(); setHits((j.results ?? []).slice(0, 6)); }
      catch { /* cancelada */ }
      setSearching(false);
    }, 250);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [query]);
  const addSymbol = async (h: Hit) => {
    setSearchMsg('');
    if (A[h.symbol]) { setAmount(h.symbol, sel[h.symbol] ?? 100); setQuery(''); setHits([]); return; }
    setAdding(h.symbol);
    try {
      const r = await fetch(`/api/growth?symbol=${encodeURIComponent(h.symbol)}`);
      const j = await r.json();
      if (!r.ok) setSearchMsg(j.error ?? 'No pudimos sumar ese activo.');
      else { setExtra((x) => [...x.filter((a) => a.t !== j.t), j]); setAmount(j.t, 100); setQuery(''); setHits([]); }
    } catch { setSearchMsg('No pudimos sumar ese activo. Probá de nuevo.'); }
    setAdding(null);
  };

  const setAmount = (t: string, v: number | null) => {
    setSel((s) => { const n = { ...s }; if (v == null) delete n[t]; else n[t] = v; return n; });
    setOrder((o) => (v == null ? o.filter((x) => x !== t) : o.includes(t) ? o : [...o, t]));
  };

  /* ---------- Plan con IA ---------- */
  const ask = async (q: string) => {
    const msg = q.trim() || EXAMPLES[0][1];
    setText(msg); setBusy(true); setPlan(null);
    try {
      const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: msg }) });
      const j = await r.json();
      if (j.mix) setPlan(j);
    } catch { /* se muestra el error abajo */ }
    setBusy(false);
  };
  const planView = useMemo(() => {
    if (!plan) return null;
    const m = plan.mensual_usd ?? 300, goal = plan.objetivo_usd;
    const rate = Math.min(PROFILE_CAP[plan.perfil], plan.mix.reduce((s, x) => s + Math.min(A[x.ticker]?.rate ?? 8, PROJECTION_CAP) * (x.pct / 100), 0));
    const months = (mm: number) => { let n = 0; while (n < 1200 && goal && fv(rate, mm, n) < goal) n++; return n; };
    if (goal) {
      const y = Math.ceil(months(m) / 12), m2 = Math.round((m * 1.6) / 10) * 10, y2 = Math.ceil(months(m2) / 12);
      return { m, rate, years: Math.min(40, y), head: y >= 100 ? 'Más de 100 años' : `${y} ${y === 1 ? 'año' : 'años'}`, text: `Con ${money(m)} por mes y una cartera ${plan.perfil} que crezca cerca de ${rate.toFixed(0)}% por año, llegarías a ${money(goal)} en unos ${y} años. Guardándolos en el colchón te llevaría ${Math.ceil(goal / m / 12)}. Si subís a ${money(m2)} por mes, lo lográs en ${y2}.` };
    }
    return { m, rate, years: 20, head: money(fv(rate, m, 240)), text: `Con ${money(m)} por mes y una cartera ${plan.perfil} que crezca cerca de ${rate.toFixed(0)}% por año, en 20 años podrías tener eso. En el colchón serían ${money(m * 240)}.` };
  }, [plan, A]);
  const loadPlan = () => {
    if (!plan || !planView) return;
    const s: Record<string, number> = {};
    plan.mix.forEach((x) => { s[x.ticker] = Math.max(10, Math.round((planView.m * x.pct) / 100 / 10) * 10); });
    setSel(s); setOrder(plan.mix.map((x) => x.ticker)); setYears(planView.years);
    simRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ---------- Simulador ---------- */
  const rows = order.filter((t) => sel[t] != null && A[t]);
  const monthlyTotal = Math.max(100, rows.reduce((sum, t) => sum + sel[t], 0)) || 300;
  const loadPortfolio = (id: string) => {
    const pf = PORTFOLIOS.find((p) => p.id === id);
    if (!pf) return;
    const s: Record<string, number> = {};
    pf.mix.forEach((x) => { s[x.t] = Math.max(10, Math.round((monthlyTotal * x.pct) / 100 / 5) * 5); });
    setSel(s); setOrder(pf.mix.map((x) => x.t));
    simRef.current?.querySelector('.sim-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const sim = useMemo(() => {
    const proj: number[] = [], flat: number[] = [];
    let max = 1;
    for (let y = 0; y <= years; y++) {
      let tot = 0, inv = 0;
      rows.forEach((t) => { inv += sel[t] * y * 12; tot += fv(Math.min(A[t].rate, PROJECTION_CAP), sel[t], y * 12); });
      proj.push(tot); flat.push(inv); max = Math.max(max, tot, inv);
    }
    const X = (y: number) => 52 + (536 * y) / Math.max(1, years), Y = (v: number) => 232 - (200 * v) / max;
    const line = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const fin = proj[years], put = flat[years];
    let py = Y(fin) - 10, fy = Y(put) - 10; if (Math.abs(py - fy) < 20) fy = Math.min(224, py + 24);
    const ticks = [0, max / 2, max].map((v) => ({ y: Y(v), l: v >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',')} M` : `${Math.round(v / 1000)} mil` }));
    return { fin, put, proj: line(proj), flat: line(flat), area: `${line(proj)} L${X(years).toFixed(1)} 232 L52 232 Z`, py, fy, ticks };
  }, [rows.join(), sel, years, A]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <section className="sec" id="plan">
        <div className="sechead"><span className="pl-eyebrow">Tu plan con IA</span><h2>¿Qué querés lograr?</h2><p>Contale a la IA, como se lo dirías a un amigo, y te arma una cartera con números.</p></div>
        <form className="panel plan-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <label htmlFor="plan-q" className="pl-eyebrow">Tu pregunta</label>
          <textarea id="plan-q" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLES[0][1]} />
          <div className="plan-actions">
            <button className="pl-btn primary" type="submit" disabled={busy} style={{ width: 'auto' }}>{busy ? 'Armando tu plan…' : 'Armame una cartera'}{ARROW}</button>
            {EXAMPLES.map(([l, q]) => <button key={l} type="button" className="plan-chip" onClick={() => ask(q)} disabled={busy}>{l}</button>)}
          </div>
        </form>
        {busy && <p className="note">La IA está pensando tu cartera. Tarda unos segundos…</p>}
        {plan && planView && (
          <div className="plan-out">
            <div className="panel plan-main">
              <span className="pl-eyebrow">Perfil {plan.perfil}{plan.ai ? ' · armado con IA' : ' · cálculo automático'}</span>
              <b className="plan-head">{planView.head}</b>
              {plan.resumen && <p className="plan-lead">{plan.resumen}</p>}
              <p>{planView.text}</p>
              {plan.consejo && <p><b>Un consejo:</b> {plan.consejo}</p>}
              <button type="button" className="pl-btn primary" onClick={loadPlan} style={{ width: 'auto', alignSelf: 'flex-start' }}>Ver este plan en el simulador{ARROW}</button>
            </div>
            <div className="panel plan-mix">
              <span className="pl-eyebrow">Cómo repartir tus {money(planView.m)} por mes</span>
              {plan.mix.map((x) => (
                <div key={x.ticker} className="mixrow">
                  <div className="mixhead"><b>{A[x.ticker]?.name ?? x.ticker}</b><span className="pl-num">{x.pct}% · {money((planView.m * x.pct) / 100)}</span></div>
                  <div className="mixbar"><span style={{ width: `${x.pct}%`, background: x.ticker === 'BND' ? 'var(--line-strong)' : COLORS[A[x.ticker]?.kind ?? 'etf'] }} /></div>
                  {x.por_que && <span className="mixwhy">{x.por_que}</span>}
                </div>
              ))}
              <p className="src">Proyección con crecimiento estimado. No es un consejo de inversión.</p>
            </div>
          </div>
        )}
      </section>

      <section className="sec" id="simulador" ref={simRef}>
        <div className="sechead"><span className="pl-eyebrow">Interés compuesto</span><h2>¿Cuánto podrías tener?</h2><p>Elegí en qué poner, cuánto por mes y por cuántos años. Te mostramos cuánto tendrías si crece como creció en los últimos 10 años, contra dejar la plata quieta.</p></div>
        <div className="sim-pick">
          <div className="sim-search">
            <label htmlFor="sim-q" className="pl-eyebrow">Buscá cualquier acción, ETF o cripto</label>
            <input id="sim-q" type="search" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tesla, Galicia, Solana, VOO…" aria-describedby="sim-q-msg" />
            {(hits.length > 0 || searching) && (
              <ul className="sim-hits" role="listbox" aria-label="Resultados">
                {searching && !hits.length && <li className="sim-hit muted">Buscando…</li>}
                {hits.map((h) => (
                  <li key={h.symbol}>
                    <button type="button" className="sim-hit" onClick={() => addSymbol(h)} disabled={adding != null}>
                      <span><b>{h.name}</b><small>{h.symbol}{h.exchange ? ` · ${h.exchange}` : ''}</small></span>
                      <span className="sim-hit-add">{adding === h.symbol ? 'Calculando…' : A[h.symbol] && sel[h.symbol] != null ? 'Ya está' : 'Sumar'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p id="sim-q-msg" className="note" aria-live="polite">{searchMsg}</p>
          </div>
          <div className="sim-cats" role="tablist" aria-label="Carteras modelo por nivel de riesgo">
            {CATEGORIES.map((c) => <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className="sim-cat" onClick={() => setCat(c.id)}>{c.label}</button>)}
          </div>
          <div className="pf-grid" role="tabpanel">
            {PORTFOLIOS.filter((p) => p.cat === cat).map((pf) => {
              const items = pf.mix.filter((x) => A[x.t]);
              const exp = items.reduce((sum, x) => sum + Math.min(A[x.t].rate, PROJECTION_CAP) * (x.pct / 100), 0);
              const active = items.length === rows.length && items.every((x) => sel[x.t] != null);
              return (
                <article key={pf.id} className={`pf-card${active ? ' on' : ''}`}>
                  <header><b>{pf.name}</b><span>{pf.by}</span></header>
                  <p>{pf.idea}</p>
                  <div className="pf-bar" aria-hidden="true">{items.map((x) => <i key={x.t} style={{ width: `${x.pct}%`, background: CLASS_COLOR[ASSET_CLASS[x.t] ?? 'empresa'] }} title={`${A[x.t].name} ${x.pct}%`} />)}</div>
                  <details>
                    <summary><span>Qué hay adentro · {items.length} activos</span><span className="pl-num pf-exp">~{exp.toFixed(1).replace('.', ',')}% por año</span></summary>
                    <ul>{items.map((x) => <li key={x.t}><i style={{ background: CLASS_COLOR[ASSET_CLASS[x.t] ?? 'empresa'] }} /><span>{A[x.t].name}</span><b className="pl-num">{x.pct}%</b></li>)}</ul>
                  </details>
                  <button type="button" className="pf-cta" onClick={() => loadPortfolio(pf.id)}>{active ? 'Cargada en el simulador' : 'Ponerla en el simulador'}{ARROW}</button>
                </article>
              );
            })}
          </div>
          <p className="note">Al ponerla en el simulador, repartimos tus {money(monthlyTotal)} por mes según sus porcentajes. Después podés mover cada monto.</p>
        </div>
        <div className="sim-grid">
          <div className="sim-rows">
            {rows.length ? rows.map((t) => {
              const a = A[t];
              return (
                <div key={t} className="panel sim-row">
                  <div className="sim-row-h">
                    <span><b>{a.name}</b><small>{a.t.replace('-USD', '')} · {a.rate >= 0 ? 'creció' : 'cayó'} {Math.abs(a.rate).toLocaleString('es-AR')}% por año{a.estimated ? ' (aprox.)' : ` en ${a.years} ${a.years === 1 ? 'año' : 'años'}`} · riesgo {RISK_LABEL[a.risk].toLowerCase()}</small></span>
                    <b className="pl-num">{money(sel[t])}/mes</b>
                    <button type="button" className="sim-del" onClick={() => setAmount(t, null)} aria-label={`Sacar ${a.name} del simulador`}>{TRASH}</button>
                  </div>
                  <input type="range" min={0} max={1000} step={5} value={sel[t]} onChange={(e) => setAmount(t, Number(e.target.value))} aria-label={`Cuánto por mes en ${a.name}`} />
                </div>
              );
            }) : <p className="note">Buscá un activo o tocá una idea de arriba para empezar.</p>}
            <label className="panel sim-row" htmlFor="sim-years">
              <span className="sim-row-h"><b style={{ flex: 1 }}>Durante</b><b className="pl-num">{years} {years === 1 ? 'año' : 'años'}</b></span>
              <input id="sim-years" type="range" min={1} max={40} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} />
            </label>
          </div>
          <div className="sim-out">
            <span>En {years} {years === 1 ? 'año' : 'años'} podrías tener</span>
            <b className="sim-total">{money(sim.fin)}</b>
            <span>Si la dejabas parada: <b>{money(sim.put)}</b>. El interés compuesto te suma <b className="hl">{money(Math.max(0, sim.fin - sim.put))}</b>.</span>
            <svg viewBox="0 0 600 270" role="img" aria-label={`Invertida llegaría a ${money(sim.fin)} y parada quedaría en ${money(sim.put)}`} className="sim-chart">
              {sim.ticks.map((k, i) => <g key={i}><line x1="52" x2="588" y1={k.y} y2={k.y} stroke="rgba(241,238,230,.18)" strokeDasharray="3 6" /><text x="46" y={k.y + 4} textAnchor="end" fontSize="11" fill="#A8A39A">{k.l}</text></g>)}
              <path d={sim.area} fill="#4BD08F" fillOpacity=".18" />
              <path d={sim.proj} fill="none" stroke="#4BD08F" strokeWidth="4" strokeLinejoin="round" />
              <path d={sim.flat} fill="none" stroke="#F6B40E" strokeWidth="3" strokeDasharray="7 7" />
              <text x="52" y="256" fontSize="12" fill="#A8A39A">Hoy</text>
              <text x="588" y="256" fontSize="12" fill="#A8A39A" textAnchor="end">En {years} años</text>
              <text x="588" y={sim.py} fontSize="15" fill="#4BD08F" textAnchor="end" fontWeight="700">Invertida</text>
              <text x="588" y={sim.fy} fontSize="15" fill="#F6B40E" textAnchor="end" fontWeight="700">Parada</text>
            </svg>
            <p className="src">Crecimiento anual compuesto de los últimos 10 años con precios de Yahoo Finance (sin contar dividendos). Para proyectar topeamos en {PROJECTION_CAP}% por año: ninguna inversión crece así para siempre. El pasado no garantiza el futuro.</p>
          </div>
        </div>
      </section>
    </>
  );
}
