export type MarketId = 'us' | 'eu' | 'jp' | 'hk' | 'br' | 'ar' | 'cr';

export type Market = {
  id: MarketId;
  name: string;
  nick: string;
  city: string;
  index: string;          // símbolo del índice en FMP
  indexName: string;
  exchanges: string[];    // códigos de bolsa de FMP (batch-exchange-quote)
  currency: string;       // moneda en la que cotiza la mayoría de sus acciones
  minCap: number;         // capitalización mínima (en USD) para entrar en rankings
  hours?: [number, number]; // horario de la bolsa en UTC (aprox.)
  lonLat?: [number, number];
  label?: 'r' | 'l' | 't' | 'tl' | 'b';
  context: string;        // contexto general del mercado, en criollo
};

export const MARKETS: Market[] = [
  { id: 'us', name: 'Estados Unidos', nick: 'Wall Street', city: 'Nueva York', index: '^GSPC', indexName: 'S&P 500', exchanges: ['NASDAQ', 'NYSE'], currency: 'USD', minCap: 10e9, hours: [13.5, 20], lonLat: [-74, 40.7], label: 'r',
    context: 'El mercado más grande del mundo. Lo mueven las grandes tecnológicas y lo que diga la Reserva Federal sobre las tasas.' },
  { id: 'eu', name: 'Europa', nick: 'Europa', city: 'Fráncfort', index: '^STOXX50E', indexName: 'Euro Stoxx 50', exchanges: ['XETRA', 'EURONEXT'], currency: 'EUR', minCap: 5e9, hours: [8, 16.5], lonLat: [8.7, 50.1], label: 't',
    context: 'Bancos, autos, lujo e industria. Mira de cerca al Banco Central Europeo y a la economía de China.' },
  { id: 'jp', name: 'Japón', nick: 'Tokio', city: 'Tokio', index: '^N225', indexName: 'Nikkei 225', exchanges: ['JPX'], currency: 'JPY', minCap: 5e9, hours: [0, 6], lonLat: [139.7, 35.7], label: 'tl',
    context: 'Autos, electrónica y bancos. Cuando el yen se abarata, a los exportadores les va mejor.' },
  { id: 'hk', name: 'Hong Kong', nick: 'Hong Kong', city: 'Hong Kong', index: '^HSI', indexName: 'Hang Seng', exchanges: ['HKSE'], currency: 'HKD', minCap: 5e9, hours: [1.5, 8], lonLat: [114.2, 22.3], label: 'l',
    context: 'La puerta de entrada a las grandes empresas chinas. Muy sensible a los anuncios del gobierno de Pekín.' },
  { id: 'br', name: 'Brasil', nick: 'San Pablo', city: 'San Pablo', index: '^BVSP', indexName: 'Ibovespa', exchanges: ['SAO'], currency: 'BRL', minCap: 1e9, hours: [13, 20], lonLat: [-46.6, -23.5], label: 'r',
    context: 'Petróleo, minería y bancos. Se mueve con el precio de las materias primas y las tasas de Brasil.' },
  { id: 'ar', name: 'Argentina', nick: 'Buenos Aires', city: 'Buenos Aires', index: '^MERV', indexName: 'Merval', exchanges: ['BUE'], currency: 'ARS', minCap: 0.2e9, hours: [14, 20], lonLat: [-58.4, -34.6], label: 'b',
    context: 'Bancos y energéticas. Muy atento al riesgo país, al dólar y a las noticias de la economía local.' },
  { id: 'cr', name: 'Cripto', nick: 'El mundo cripto', city: '', index: 'BTCUSD', indexName: 'Bitcoin', exchanges: [], currency: 'USD', minCap: 1e9,
    context: 'Opera las 24 horas, todos los días. Se mueve mucho más que las acciones y Bitcoin arrastra al resto.' }
];

export const marketById = (id: string) => MARKETS.find((m) => m.id === id);

/** Mercado de un símbolo según su sufijo en FMP. */
export function marketOfSymbol(symbol: string, exchange?: string): MarketId {
  const s = symbol.toUpperCase();
  if (/^[A-Z0-9]+USD$/.test(s) && (exchange === 'CRYPTO' || !exchange)) {
    if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD', 'DOGEUSD', 'ADAUSD'].includes(s) || exchange === 'CRYPTO') return 'cr';
  }
  if (exchange === 'CRYPTO') return 'cr';
  if (s.endsWith('.T')) return 'jp';
  if (s.endsWith('.HK')) return 'hk';
  if (s.endsWith('.SA')) return 'br';
  if (s.endsWith('.BA')) return 'ar';
  if (/\.(DE|PA|AS|MC|MI|BR|LS|L|SW|ST|HE|CO|OL|VI|IR)$/.test(s)) return 'eu';
  return 'us';
}

export function isOpen(m: Market, now = new Date()) {
  if (m.id === 'cr') return true;
  if (!m.hours) return false;
  const wd = now.getUTCDay();
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  return wd > 0 && wd < 6 && h >= m.hours[0] && h < m.hours[1];
}
