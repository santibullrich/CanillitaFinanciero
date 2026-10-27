'use client';
import { useState } from 'react';
import { initials, logoUrl } from '@/lib/logo';

export default function Logo({ symbol, name, website, crypto, size }: { symbol: string; name: string; website?: string; crypto?: boolean; size?: 'lg' }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : logoUrl({ symbol, name, website, crypto });
  return (
    <span className={`logo${crypto ? ' cr' : ''}${size ? ' ' + size : ''}`} aria-hidden="true">
      {initials(name || symbol)}
      {src && <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}
