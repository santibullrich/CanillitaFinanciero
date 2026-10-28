/** Activos del armador de cartera y del simulador. Lo que se puede mostrar en el navegador. */
export type AssetKind = 'etf' | 'stock' | 'crypto';
export type Asset = { t: string; name: string; kind: AssetKind; risk: 1 | 2 | 3 | 4; why: string; rate: number; years: number; estimated: boolean };

/** `fallback`: crecimiento anual aproximado de los últimos 10 años, por si Yahoo no responde. */
export type AssetBase = Omit<Asset, 'rate' | 'years' | 'estimated'> & { fallback: number };
export const ASSET_LIST: AssetBase[] = [
  { t: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'etf', risk: 2, why: 'Las 500 empresas más grandes de EE.UU. en una sola compra.', fallback: 12 },
  { t: 'VYM', name: 'Vanguard High Dividend Yield ETF', kind: 'etf', risk: 1, why: 'Empresas maduras que reparten mucha ganancia.', fallback: 8 },
  { t: 'BND', name: 'Vanguard Total Bond Market ETF', kind: 'etf', risk: 1, why: 'Rinde poco pero amortigua las caídas.', fallback: 0 },
  { t: 'GLD', name: 'SPDR Gold Shares', kind: 'etf', risk: 2, why: 'El refugio cuando hay miedo.', fallback: 10 },
  { t: 'KO', name: 'Coca-Cola', kind: 'stock', risk: 1, why: 'Estable y paga dividendos.', fallback: 6 },
  { t: 'JNJ', name: 'Johnson & Johnson', kind: 'stock', risk: 1, why: 'Salud: la gente la necesita siempre.', fallback: 5 },
  { t: 'PG', name: 'Procter & Gamble', kind: 'stock', risk: 1, why: 'Jabón, pañales y pasta de dientes: se compran siempre.', fallback: 8 },
  { t: 'BRK-B', name: 'Berkshire Hathaway', kind: 'stock', risk: 2, why: 'La empresa de Warren Buffett: dueña de decenas de negocios.', fallback: 12 },
  { t: 'AAPL', name: 'Apple', kind: 'stock', risk: 3, why: 'iPhone, servicios y una marca enorme.', fallback: 22 },
  { t: 'MSFT', name: 'Microsoft', kind: 'stock', risk: 2, why: 'Software, nube e inteligencia artificial.', fallback: 25 },
  { t: 'NVDA', name: 'Nvidia', kind: 'stock', risk: 4, why: 'Los chips de la inteligencia artificial.', fallback: 60 },
  { t: 'MELI', name: 'Mercado Libre', kind: 'stock', risk: 3, why: 'Comercio y billetera de América Latina.', fallback: 28 },
  { t: 'BTC-USD', name: 'Bitcoin', kind: 'crypto', risk: 4, why: 'La primera cripto. Se mueve muchísimo.', fallback: 55 },
  { t: 'ETH-USD', name: 'Ethereum', kind: 'crypto', risk: 4, why: 'La red de las apps cripto. Muy volátil.', fallback: 40 }
];

/** Categorías del simulador según el riesgo. */
export const CATEGORIES = [
  { id: 'conservador', label: 'Conservador', risks: [1] },
  { id: 'medio', label: 'Riesgo medio', risks: [2] },
  { id: 'alto', label: 'Riesgo alto', risks: [3, 4] }
] as const;

export const RISK_LABEL = ['', 'Bajo', 'Medio', 'Alto', 'Muy alto'] as const;
/** Tope para proyectar: ninguna inversión crece al ritmo de su mejor década para siempre. */
export const PROJECTION_CAP = 15;
export const PROFILE_CAP = { conservador: 7, moderado: 9, arriesgado: 12 } as const;
export type Profile = keyof typeof PROFILE_CAP;
