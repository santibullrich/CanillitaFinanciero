/** URL del logo en logo.dev (solo con la clave pública). Devuelve null si no hay clave. */
export function logoUrl(opts: { symbol: string; name?: string; website?: string; crypto?: boolean }): string | null {
  const t = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!t) return null;
  const q = `?token=${t}&size=64`;
  const base = 'https://img.logo.dev';
  if (opts.website) {
    try { return `${base}/${new URL(opts.website).hostname.replace(/^www\./, '')}${q}`; } catch { /* sigue */ }
  }
  if (opts.crypto) return `${base}/crypto/${opts.symbol.replace(/-?USD$/, '').toLowerCase()}${q}`;
  if (!opts.symbol.includes('.') && !opts.symbol.startsWith('^')) return `${base}/ticker/${encodeURIComponent(opts.symbol)}${q}`;
  if (opts.name) return `${base}/name/${encodeURIComponent(opts.name)}${q}`;
  return null;
}

export function initials(name: string) {
  const w = name.replace(/\(.*?\)/g, '').replace(/,?\s+(Inc|Corp|Corporation|S\.A\.|SA|Ltd|plc|N\.V\.|AG|SE|Co)\.?$/i, '').trim().split(/[\s-]+/).filter(Boolean);
  if (!w.length) return '?';
  return (w.length > 1 && /[A-Za-zÁÉÍÓÚ]/.test(w[1][0]) ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
}
