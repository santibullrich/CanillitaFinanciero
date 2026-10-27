import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { themeInit } from '@/components/ThemeToggle';
import { supabaseServer } from '@/lib/supabase/server';
import { getQuotes } from '@/lib/fmp';
import { MARKETS } from '@/lib/markets';
import { dir, fmtPct, nf } from '@/lib/format';

export const metadata: Metadata = {
  title: 'CanillitaFinanciero',
  description: 'Todas las noticias del mercado mundial, contadas para que las entiendan Don Carlos y Doña Rosa.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#75AADB' };

async function currentUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const { data: { user } } = await supabaseServer().auth.getUser();
    return user;
  } catch { return null; }
}

async function Tape() {
  const qs = await getQuotes(MARKETS.map((m) => m.index), 60).catch(() => []);
  if (!qs.length) return null;
  const names = Object.fromEntries(MARKETS.map((m) => [m.index, m.indexName]));
  const items = qs.map((q) => (
    <span className="pl-tick" key={q.symbol}><b>{(names[q.symbol] ?? q.symbol).toUpperCase()}</b><span>{nf(q.price > 9999 ? 0 : 2).format(q.price)}</span><span className={`pl-${dir(q.changePct)}`}>{fmtPct(q.changePct)}</span></span>
  ));
  return <div className="pl-ticker" aria-label="Índices del mundo"><div className="pl-ticker-track">{items}<span aria-hidden="true" style={{ display: 'contents' }}>{items}</span></div></div>;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const nombre = (user?.user_metadata?.nombre as string) || (user?.email?.split('@')[0] ?? null);
  const date = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).toUpperCase();
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Martian+Mono:wght@400;600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <Header name={user ? nombre : null} />
        <div className="dateline-band"><div className="wrap"><div className="pl-dateline"><span>{date} · BUENOS AIRES</span><span>Edición en vivo</span></div></div></div>
        <Tape />
        <nav className="subnav" aria-label="Secciones"><div className="wrap">
          <Link href="/">Inicio</Link><Link href="/explorar">Explorar</Link><Link href="/mercado/cr">Cripto</Link><Link href="/mercado/ar">Argentina</Link><Link href="/mercado/us">Wall Street</Link><Link href="/joyitas">Joyitas</Link><Link href="/cartera">Mi cartera</Link>
        </div></nav>
        <div id="view">{children}</div>
        <footer className="foot"><div className="wrap">
          <span className="pl-wordmark"><i /><span className="stack"><b>Canillita</b><span>Financiero</span></span></span>
          <p className="bajada">Todas las noticias del mercado mundial, contadas para que las entiendan Don Carlos y Doña Rosa.</p>
          <p>Nada de lo que ves es un consejo de inversión. Antes de invertir, informate y elegí lo que tenga sentido para vos. Los precios pueden tener demora según la bolsa.</p>
          <p>Datos de mercado: Financial Modeling Prep. <a href="https://logo.dev" target="_blank" rel="noopener noreferrer">Logos provistos por Logo.dev</a>.</p>
        </div></footer>
      </body>
    </html>
  );
}
