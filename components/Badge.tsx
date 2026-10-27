import { dir, fmtPct } from '@/lib/format';

export function Arrow({ c }: { c: number }) {
  const d = dir(c);
  return (
    <svg viewBox="0 0 8 8" aria-hidden="true">
      {d === 'up' ? <path d="M4 0 8 8H0z" fill="currentColor" /> : d === 'down' ? <path d="M0 0h8L4 8z" fill="currentColor" /> : <rect y="3" width="8" height="2" fill="currentColor" />}
    </svg>
  );
}

export default function Badge({ c, lg }: { c: number; lg?: boolean }) {
  return (
    <span className={`pl-badge ${dir(c)}${lg ? ' lg' : ''}`}>
      <Arrow c={c} />
      <span>{fmtPct(c)}</span>
    </span>
  );
}
