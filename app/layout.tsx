import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { themeInit } from '@/components/ThemeToggle';
import { supabaseServer } from '@/lib/supabase/server';
import { getCryptoTop, getFx, getQuotes } from '@/lib/yahoo';
import { FxProvider } from '@/components/Fx';
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

/** Las 10 empresas más grandes del mundo por valor de mercado. */
const TOP10 = ['NVDA', 'MSFT', 'AAPL', 'GOOGL', 'AMZN', 'AVGO', 'META', 'TSM', 'TSLA', 'BRK-B'];
const STABLES = /^(USDT|USDC|DAI|USDE|FDUSD|TUSD|USDS|PYUSD|BUSD|USD1)-USD$/;

async function Tape() {
  const [qs, crypto] = await Promise.all([getQuotes([...TOP10, 'ARS=X', 'EURARS=X'], 60).catch(() => []), getCryptoTop().catch(() => [])]);
  const by = new Map(qs.map((q) => [q.symbol, q] as const));
  const coins = crypto.filter((c) => !STABLES.test(c.symbol)).slice(0, 3);
  const list = [
    ...TOP10.map((t) => by.get(t)).filter(Boolean).map((q) => ({ k: q!.symbol, label: q!.symbol.replace('-B', '.B'), price: `US$ ${nf(q!.price >= 1000 ? 0 : 2).format(q!.price)}`, c: q!.changePct })),
    ...[['ARS=X', 'DÓLAR'], ['EURARS=X', 'EURO']].map(([t, l]) => by.get(t) && { k: t, label: l, price: `$ ${nf(2).format(by.get(t)!.price)}`, c: by.get(t)!.changePct }).filter(Boolean) as { k: string; label: string; price: string; c: number }[],
    ...coins.map((q) => ({ k: q.symbol, label: q.symbol.replace('-USD', ''), price: `US$ ${nf(q.price >= 1000 ? 0 : 2).format(q.price)}`, c: q.changePct }))
  ];
  if (!list.length) return null;
  const items = list.map((x) => (
    <span className="pl-tick" key={x.k}><b>{x.label}</b><span>{x.price}</span><span className={`pl-${dir(x.c)}`}>{fmtPct(x.c)}</span></span>
  ));
  return <div className="pl-ticker" aria-label="Las 10 empresas más grandes del mundo, el dólar, el euro y las principales criptos"><div className="pl-ticker-track">{items}<span aria-hidden="true" style={{ display: 'contents' }}>{items}</span></div></div>;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, fx] = await Promise.all([currentUser(), getFx().catch(() => ({ USD: 1 }) as Record<string, number>)]);
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
        <FxProvider rates={fx}>
        <Header name={user ? nombre : null} />
        <div className="dateline-band"><div className="wrap"><div className="pl-dateline"><span>{date} · BUENOS AIRES</span><span>Edición en vivo</span></div></div></div>
        <Tape />
        <nav className="subnav" aria-label="Secciones"><div className="wrap">
          <Link href="/">Inicio</Link><Link href="/explorar">Explorar</Link><Link href="/mercado/cr">Cripto</Link><Link href="/mercado/ar">Argentina</Link><Link href="/mercado/us">Wall Street</Link><Link href="/joyitas">Joyitas</Link><Link href="/redes">Redes</Link><Link href="/cartera">Mi cartera</Link>
        </div></nav>
        <div id="view">{children}</div>
        <footer className="foot"><div className="wrap">
          <span className="pl-wordmark"><i /><span className="stack"><b>Canillita</b><span>Financiero</span></span></span>
          <p className="bajada">Todas las noticias del mercado mundial, contadas para que las entiendan Don Carlos y Doña Rosa.</p>
          <p>Nada de lo que ves es un consejo de inversión. Antes de invertir, informate y elegí lo que tenga sentido para vos. Los precios pueden tener demora según la bolsa.</p>
          <p>Datos de mercado: Yahoo Finance (pueden tener demora), Finnhub, SentiSense y CoinGecko. Los precios se muestran en dólares al tipo de cambio del momento. <a href="https://logo.dev" target="_blank" rel="noopener noreferrer">Logos provistos por Logo.dev</a>.</p>
        </div></footer>
        </FxProvider>
      </body>
    </html>
  );
}
