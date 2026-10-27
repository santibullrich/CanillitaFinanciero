export type MarketId = 'us' | 'ca' | 'mx' | 'br' | 'ar' | 'uk' | 'eu' | 'ch' | 'in' | 'cn' | 'hk' | 'jp' | 'kr' | 'tw' | 'au' | 'cr';

export type Market = {
  id: MarketId;
  name: string;
  nick: string;
  city: string;
  index: string;            // símbolo del índice en Yahoo Finance
  indexName: string;
  exchanges: string[];      // bolsas que agrupa (solo informativo)
  currency: string;         // moneda del valor de mercado
  quoteCurrency?: string;   // moneda del precio si es distinta (Londres cotiza en peniques)
  minCap: number;           // valor de mercado mínimo (USD) para entrar en los rankings
  hours?: [number, number]; // horario de la bolsa en UTC (aproximado, sin horario de verano)
  lonLat?: [number, number];// ubicación en el mapa (solo los que se dibujan)
  label?: 'r' | 'l' | 't' | 'tl' | 'b';
  context: string;
};

export const MARKETS: Market[] = [
  { id: 'us', name: 'Estados Unidos', nick: 'Wall Street', city: 'Nueva York', index: '^GSPC', indexName: 'S&P 500', exchanges: ['NASDAQ', 'NYSE'], currency: 'USD', minCap: 10e9, hours: [13.5, 20], lonLat: [-74, 40.7], label: 'r',
    context: 'El mercado más grande del mundo. Lo mueven las grandes tecnológicas y lo que diga la Reserva Federal sobre las tasas.' },
  { id: 'ca', name: 'Canadá', nick: 'Toronto', city: 'Toronto', index: '^GSPTSE', indexName: 'S&P/TSX', exchanges: ['TSX'], currency: 'CAD', minCap: 5e9, hours: [14.5, 21], lonLat: [-79.4, 43.7], label: 't',
    context: 'Bancos, minería y energía. Se mueve mucho con el precio del petróleo y del oro.' },
  { id: 'mx', name: 'México', nick: 'Ciudad de México', city: 'México', index: '^MXX', indexName: 'S&P/BMV IPC', exchanges: ['MEX'], currency: 'MXN', minCap: 1e9, hours: [14.5, 21], lonLat: [-99.1, 19.4], label: 'l',
    context: 'Telecomunicaciones, bancos, consumo y cemento. Muy atado a lo que pasa en Estados Unidos.' },
  { id: 'br', name: 'Brasil', nick: 'San Pablo', city: 'San Pablo', index: '^BVSP', indexName: 'Ibovespa', exchanges: ['SAO'], currency: 'BRL', minCap: 1e9, hours: [13, 20], lonLat: [-46.6, -23.5], label: 'r',
    context: 'Petróleo, minería y bancos. Se mueve con el precio de las materias primas y las tasas de Brasil.' },
  { id: 'ar', name: 'Argentina', nick: 'Buenos Aires', city: 'Buenos Aires', index: '^MERV', indexName: 'Merval', exchanges: ['BUE'], currency: 'ARS', minCap: 0.2e9, hours: [14, 20], lonLat: [-58.4, -34.6], label: 'b',
    context: 'Bancos y energéticas. Muy atento al riesgo país, al dólar y a las noticias de la economía local.' },
  { id: 'uk', name: 'Reino Unido', nick: 'Londres', city: 'Londres', index: '^FTSE', indexName: 'FTSE 100', exchanges: ['LSE'], currency: 'GBP', quoteCurrency: 'GBp', minCap: 5e9, hours: [8, 16.5], lonLat: [-0.1, 51.5], label: 'l',
    context: 'Petroleras, mineras, bancos y farmacéuticas. Muchas de sus empresas ganan en dólares en todo el mundo.' },
  { id: 'eu', name: 'Europa', nick: 'Europa', city: 'Fráncfort', index: '^STOXX50E', indexName: 'Euro Stoxx 50', exchanges: ['XETRA', 'EURONEXT', 'MIL', 'BME'], currency: 'EUR', minCap: 5e9, hours: [8, 16.5], lonLat: [8.7, 50.1], label: 't',
    context: 'Bancos, autos, lujo e industria. Mira de cerca al Banco Central Europeo y a la economía de China.' },
  { id: 'ch', name: 'Suiza', nick: 'Zúrich', city: 'Zúrich', index: '^SSMI', indexName: 'SMI', exchanges: ['SIX'], currency: 'CHF', minCap: 5e9,
    hours: [8, 16.5], context: 'Farmacéuticas, alimentos, relojería y bancos. Tiene fama de mercado tranquilo y de moneda fuerte.' },
  { id: 'in', name: 'India', nick: 'Bombay', city: 'Bombay', index: '^NSEI', indexName: 'Nifty 50', exchanges: ['NSE'], currency: 'INR', minCap: 5e9, hours: [3.75, 10], lonLat: [72.9, 19.1], label: 'r',
    context: 'Una de las economías que más crece. Tecnología, bancos y consumo de una clase media en expansión.' },
  { id: 'cn', name: 'China', nick: 'Shanghái', city: 'Shanghái', index: '000001.SS', indexName: 'Shanghai Composite', exchanges: ['SHH', 'SHZ'], currency: 'CNY', minCap: 5e9, hours: [1.5, 7],
    context: 'La bolsa de China continental. Muy sensible a las decisiones del gobierno y a la relación con Estados Unidos.' },
  { id: 'hk', name: 'Hong Kong', nick: 'Hong Kong', city: 'Hong Kong', index: '^HSI', indexName: 'Hang Seng', exchanges: ['HKSE'], currency: 'HKD', minCap: 5e9, hours: [1.5, 8], lonLat: [114.2, 22.3], label: 'l',
    context: 'La puerta de entrada a las grandes empresas chinas. Muy sensible a los anuncios del gobierno de Pekín.' },
  { id: 'jp', name: 'Japón', nick: 'Tokio', city: 'Tokio', index: '^N225', indexName: 'Nikkei 225', exchanges: ['JPX'], currency: 'JPY', minCap: 5e9, hours: [0, 6], lonLat: [139.7, 35.7], label: 'tl',
    context: 'Autos, electrónica y bancos. Cuando el yen se abarata, a los exportadores les va mejor.' },
  { id: 'kr', name: 'Corea del Sur', nick: 'Seúl', city: 'Seúl', index: '^KS11', indexName: 'KOSPI', exchanges: ['KSC'], currency: 'KRW', minCap: 5e9, hours: [0, 6.5],
    context: 'Chips, autos y electrónica. Samsung y SK Hynix pesan muchísimo en el índice.' },
  { id: 'tw', name: 'Taiwán', nick: 'Taipéi', city: 'Taipéi', index: '^TWII', indexName: 'TAIEX', exchanges: ['TAI'], currency: 'TWD', minCap: 5e9, hours: [1, 5.5],
    context: 'El corazón mundial de los chips. TSMC fabrica los procesadores de buena parte del planeta.' },
  { id: 'au', name: 'Australia', nick: 'Sídney', city: 'Sídney', index: '^AXJO', indexName: 'S&P/ASX 200', exchanges: ['ASX'], currency: 'AUD', minCap: 5e9, hours: [0, 6], lonLat: [151.2, -33.9], label: 'l',
    context: 'Minería y bancos. Le va bien cuando China compra mucho hierro y carbón.' },
  { id: 'cr', name: 'Cripto', nick: 'El mundo cripto', city: '', index: 'BTC-USD', indexName: 'Bitcoin', exchanges: [], currency: 'USD', minCap: 1e9,
    context: 'Opera las 24 horas, todos los días. Se mueve mucho más que las acciones y Bitcoin arrastra al resto.' }
];

export const marketById = (id: string) => MARKETS.find((m) => m.id === id);

const SUFFIX: [RegExp, MarketId][] = [
  [/\.TO$|\.V$/, 'ca'], [/\.MX$/, 'mx'], [/\.SA$/, 'br'], [/\.BA$/, 'ar'], [/\.L$/, 'uk'],
  [/\.(DE|F|PA|AS|MC|MI|BR|LS|VI|IR|HE)$/, 'eu'], [/\.SW$/, 'ch'], [/\.(NS|BO)$/, 'in'], [/\.(SS|SZ)$/, 'cn'],
  [/\.HK$/, 'hk'], [/\.T$/, 'jp'], [/\.(KS|KQ)$/, 'kr'], [/\.(TW|TWO)$/, 'tw'], [/\.AX$/, 'au']
];

/** Mercado de un símbolo según su sufijo en Yahoo Finance. Devuelve 'xx' para bolsas que la app todavía no agrupa. */
export function marketOfSymbol(symbol: string, exchange?: string): MarketId | 'xx' {
  const s = symbol.toUpperCase();
  if (exchange === 'CRYPTO' || exchange === 'CCC' || /-USD$/.test(s)) return 'cr';
  for (const [re, id] of SUFFIX) if (re.test(s)) return id;
  if (s.includes('.')) return 'xx';
  return 'us';
}

export function isOpen(m: Market, now = new Date()) {
  if (m.id === 'cr') return true;
  if (!m.hours) return false;
  const wd = now.getUTCDay();
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  return wd > 0 && wd < 6 && h >= m.hours[0] && h < m.hours[1];
}
