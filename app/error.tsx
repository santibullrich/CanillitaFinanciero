'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap" style={{ paddingBlock: 64 }}>
      <section className="sec"><span className="pl-eyebrow">Algo falló</span><h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, lineHeight: 0.95 }}>No pudimos cargar los datos</h1>
        <p className="pl-lede">Puede ser un corte momentáneo del proveedor de precios. Probá de nuevo en unos segundos.</p>
        <div><button className="pl-btn primary" type="button" onClick={reset}>Reintentar</button></div></section>
    </main>
  );
}
