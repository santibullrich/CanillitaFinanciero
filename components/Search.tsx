'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from './Badge';
import Flag from './Flag';
import Logo from './Logo';
import { marketById } from '@/lib/markets';
import { symbolPath } from '@/lib/format';

type Hit = { symbol: string; name: string; exchange: string; market: string; changePct: number | null };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function Highlight({ text, q }: { text: string; q: string }) {
  const i = norm(text).indexOf(norm(q));
  if (!q || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/** Buscador global. onPick permite usarlo para elegir un activo (por ejemplo en la cartera). */
export default function Search({ onPick, placeholder = '¿Qué empresa te interesa?', compact }: { onPick?: (h: Hit) => void; placeholder?: string; compact?: boolean }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q.trim()) { setHits([]); setMsg(''); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        const j = await r.json();
        setHits(j.results ?? []);
        setMsg(j.error ?? ((j.results ?? []).length ? '' : `No encontramos “${q}”. Probá con otro nombre o con el ticker.`));
        setSel(0); setOpen(true);
      } catch { /* cancelada */ }
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const slash = (e: KeyboardEvent) => {
      if (compact) return;
      const a = document.activeElement as HTMLElement | null;
      if (e.key === '/' && !(a && /input|textarea|select/i.test(a.tagName))) { e.preventDefault(); input.current?.focus(); }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', slash);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', slash); };
  }, [compact]);

  const pick = (h: Hit) => {
    setOpen(false); setQ('');
    if (onPick) onPick(h); else router.push(symbolPath(h.symbol));
  };

  return (
    <div className="search-wrap" ref={box}>
      <label className="pl-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input ref={input} type="search" value={q} placeholder={placeholder} autoComplete="off" aria-label="Buscar una empresa"
          onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (hits.length) setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length); }
            else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); pick(hits[sel]); }
            else if (e.key === 'Escape') setOpen(false);
          }} />
        {!compact && <kbd>/</kbd>}
      </label>
      {open && (hits.length > 0 || msg) && (
        <div className="results pl-results" role="listbox">
          {hits.map((h, i) => (
            <button key={h.symbol} type="button" role="option" aria-selected={i === sel} className={`pl-result${i === sel ? ' on' : ''}`} onClick={() => pick(h)}>
              <span className="nm"><Logo symbol={h.symbol} name={h.name} crypto={h.market === 'cr'} />
                <span><Highlight text={h.name} q={q} /><small><Flag id={h.market} />{marketById(h.market)?.name} · {h.symbol}</small></span>
              </span>
              {h.changePct != null && <Badge c={h.changePct} />}
            </button>
          ))}
          {!hits.length && <div className="empty">{msg}</div>}
        </div>
      )}
    </div>
  );
}
