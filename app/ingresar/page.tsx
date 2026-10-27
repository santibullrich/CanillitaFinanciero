import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Ingresar · CanillitaFinanciero' };

export default function Ingresar({ searchParams }: { searchParams: { volver?: string; error?: string } }) {
  return (
    <section className="pl-atmo heroband"><div className="pl-hero"><div className="hero-grid">
      <div className="hero-copy pl-reveal">
        <span className="pl-eyebrow">Tu cuenta</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(46px,10vw,80px)', lineHeight: 0.92 }}>Armá tu <mark className="pl-hl">cartera</mark></h1>
        <p className="pl-lede">Con una cuenta seguís las empresas que te interesan, cargás lo que compraste y ves cuánto vas ganando o perdiendo, todos los días.</p>
        <ul className="perks">
          <li><b>Lista de seguimiento.</b> Tus empresas y monedas, siempre a mano.</li>
          <li><b>Tu ganancia, en vivo.</b> Total y del día, en dólares.</li>
          <li><b>Asesor con IA.</b> Busca los puntos débiles de tu cartera y te propone cómo rotarla.</li>
        </ul>
      </div>
      <AuthForm next={searchParams.volver || '/cartera'} initialError={searchParams.error ? 'El link venció o ya se usó. Ingresá con tu email y contraseña.' : undefined} />
    </div></div></section>
  );
}
