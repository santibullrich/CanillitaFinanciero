import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="wrap" style={{ paddingBlock: 64 }}>
      <section className="sec"><span className="pl-eyebrow">Error 404</span><h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, lineHeight: 0.95 }}>No encontramos esa página</h1>
        <p className="pl-lede">Puede que el ticker esté mal escrito. Probá con el buscador de arriba.</p>
        <div><Link className="pl-btn primary" href="/">Volver al inicio</Link></div></section>
    </main>
  );
}
