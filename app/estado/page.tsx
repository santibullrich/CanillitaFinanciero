import { runChecks, type Check } from '@/lib/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const metadata = { title: 'Estado · CanillitaFinanciero', robots: { index: false } };

function Group({ title, items }: { title: string; items: Check[] }) {
  return (
    <section className="sec">
      <div className="sechead"><span className="pl-eyebrow">{title}</span></div>
      <div className="pl-list">
        {items.map((c, i) => (
          <div className="pl-row status-row" key={c.name + i}>
            <span className={`pl-badge ${c.ok ? 'up' : 'down'}`}>{c.ok ? 'OK' : 'FALLA'}</span>
            <span className="pl-name">{c.name}</span>
            <span className="pl-meta" style={{ whiteSpace: 'normal' }}>{c.detail}{c.fix && <><br /><b>Qué hacer:</b> {c.fix}</>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Estado() {
  const r = await runChecks();
  const fails = [...r.env, ...r.data, ...r.db].filter((c) => !c.ok).length;
  return (
    <main className="wrap" style={{ paddingBlock: 32 }}>
      <section className="sec">
        <span className="pl-eyebrow">Diagnóstico</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px,9vw,72px)', lineHeight: 0.95 }}>{fails ? `${fails} cosas para revisar` : 'Todo funciona'}</h1>
        <p className="pl-lede">Esta página prueba en vivo cada fuente de datos de la app. No muestra ninguna clave. Revisado: {new Date(r.at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.</p>
      </section>
      <Group title="Variables en Vercel" items={r.env} />
      <Group title="Datos de mercado" items={r.data} />
      <Group title="Fuentes probadas desde Vercel" items={r.sources} />
      <Group title="Base de datos (Supabase)" items={r.db} />
    </main>
  );
}
