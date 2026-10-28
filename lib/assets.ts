/** Activos del armador de cartera y del simulador. Lo que se puede mostrar en el navegador. */
export type AssetKind = 'etf' | 'stock' | 'crypto';
export type Asset = { t: string; name: string; kind: AssetKind; risk: 1 | 2 | 3 | 4; why: string; rate: number; years: number; estimated: boolean };

/** `fallback`: rendimiento total anual aproximado de los últimos 10 años, por si Yahoo no responde. */
export type AssetBase = Omit<Asset, 'rate' | 'years' | 'estimated'> & { fallback: number };
export const ASSET_LIST: AssetBase[] = [
  // Bonos y efectivo
  { t: 'BND', name: 'Vanguard Total Bond Market ETF', kind: 'etf', risk: 1, why: 'Miles de bonos de EE.UU. en uno: rinde poco y frena las caídas.', fallback: 1.5 },
  { t: 'SGOV', name: 'iShares 0-3 Month Treasury Bond ETF', kind: 'etf', risk: 1, why: 'Letras del Tesoro de EE.UU.: casi como plata en el banco, pero rindiendo.', fallback: 2.5 },
  { t: 'SCHP', name: 'Schwab U.S. TIPS ETF', kind: 'etf', risk: 1, why: 'Bonos que se ajustan por inflación.', fallback: 2.5 },
  { t: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', kind: 'etf', risk: 1, why: 'Bonos del Tesoro a 7-10 años: suelen subir cuando la bolsa cae fuerte.', fallback: 1 },
  // Canastas de acciones
  { t: 'VTI', name: 'Vanguard Total Stock Market ETF', kind: 'etf', risk: 2, why: 'Todo el mercado de EE.UU., más de 3.500 empresas, en una compra.', fallback: 13 },
  { t: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'etf', risk: 2, why: 'Las 500 empresas más grandes de EE.UU. en una sola compra.', fallback: 13 },
  { t: 'VXUS', name: 'Vanguard Total International Stock ETF', kind: 'etf', risk: 2, why: 'Miles de empresas fuera de EE.UU.: Europa, Japón, emergentes.', fallback: 6 },
  { t: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', kind: 'etf', risk: 3, why: 'Países emergentes: China, India, Taiwán, Brasil.', fallback: 5 },
  { t: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', kind: 'etf', risk: 1, why: '100 empresas sólidas que pagan y suben sus dividendos.', fallback: 11 },
  { t: 'VYM', name: 'Vanguard High Dividend Yield ETF', kind: 'etf', risk: 1, why: 'Empresas maduras que reparten mucha ganancia.', fallback: 10 },
  { t: 'VNQ', name: 'Vanguard Real Estate ETF', kind: 'etf', risk: 2, why: 'Inmobiliarias que cotizan en bolsa y reparten alquileres.', fallback: 5 },
  { t: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', kind: 'etf', risk: 2, why: 'Bonos del Tesoro a largo plazo: suben fuerte cuando la economía se frena.', fallback: -1 },
  { t: 'DBC', name: 'Invesco DB Commodity Index ETF', kind: 'etf', risk: 3, why: 'Petróleo, metales y granos: sube cuando hay inflación.', fallback: 4 },
  { t: 'GLD', name: 'SPDR Gold Shares', kind: 'etf', risk: 2, why: 'Oro: el refugio cuando hay miedo o inflación.', fallback: 10 },
  // Empresas
  { t: 'JNJ', name: 'Johnson & Johnson', kind: 'stock', risk: 1, why: 'Salud: remedios y equipos que se usan siempre.', fallback: 8 },
  { t: 'KO', name: 'Coca-Cola', kind: 'stock', risk: 1, why: 'Estable y paga dividendos hace más de 60 años.', fallback: 8 },
  { t: 'PG', name: 'Procter & Gamble', kind: 'stock', risk: 1, why: 'Jabón, pañales y pasta de dientes: se compran siempre.', fallback: 10 },
  { t: 'BRK-B', name: 'Berkshire Hathaway', kind: 'stock', risk: 2, why: 'La empresa de Warren Buffett: dueña de decenas de negocios.', fallback: 12 },
  { t: 'MSFT', name: 'Microsoft', kind: 'stock', risk: 2, why: 'Software, nube e inteligencia artificial.', fallback: 27 },
  { t: 'AAPL', name: 'Apple', kind: 'stock', risk: 3, why: 'iPhone, servicios y una marca enorme.', fallback: 24 },
  { t: 'GOOGL', name: 'Alphabet (Google)', kind: 'stock', risk: 3, why: 'Buscador, YouTube, nube e inteligencia artificial.', fallback: 20 },
  { t: 'AMZN', name: 'Amazon', kind: 'stock', risk: 3, why: 'Comercio online y la nube más grande del mundo.', fallback: 22 },
  { t: 'NVDA', name: 'Nvidia', kind: 'stock', risk: 4, why: 'Los chips que hacen funcionar la inteligencia artificial.', fallback: 70 },
  { t: 'TSM', name: 'Taiwan Semiconductor (TSMC)', kind: 'stock', risk: 3, why: 'Fabrica los chips de Apple, Nvidia y casi todos.', fallback: 30 },
  { t: 'AVGO', name: 'Broadcom', kind: 'stock', risk: 3, why: 'Chips y redes para los centros de datos de IA.', fallback: 40 },
  { t: 'MELI', name: 'Mercado Libre', kind: 'stock', risk: 3, why: 'Comercio y billetera de América Latina.', fallback: 30 },
  // Cripto
  { t: 'BTC-USD', name: 'Bitcoin', kind: 'crypto', risk: 4, why: 'La primera cripto. Puede subir o bajar 50% en un año.', fallback: 60 },
  { t: 'ETH-USD', name: 'Ethereum', kind: 'crypto', risk: 4, why: 'La red de las apps cripto. Muy volátil.', fallback: 45 }
];

/** Clase de cada activo, para pintar la barra de reparto de las carteras. */
export const ASSET_CLASS: Record<string, 'bonos' | 'eeuu' | 'mundo' | 'oro' | 'inmuebles' | 'materias' | 'empresa' | 'cripto'> = {
  BND: 'bonos', SGOV: 'bonos', SCHP: 'bonos', IEF: 'bonos', TLT: 'bonos',
  VTI: 'eeuu', SPY: 'eeuu', SCHD: 'eeuu', VYM: 'eeuu', VXUS: 'mundo', VWO: 'mundo',
  VNQ: 'inmuebles', GLD: 'oro', DBC: 'materias', 'BTC-USD': 'cripto', 'ETH-USD': 'cripto'
};
export const CLASS_LABEL = { bonos: 'Bonos', eeuu: 'Acciones EE.UU.', mundo: 'Resto del mundo', oro: 'Oro', inmuebles: 'Inmuebles', materias: 'Materias primas', empresa: 'Empresas', cripto: 'Cripto' } as const;

/**
 * Seis carteras modelo, dos por nivel de riesgo, basadas en cómo arman carteras los profesionales:
 * Vanguard (LifeStrategy), John Bogle (tres fondos), David Swensen (Yale), Ray Dalio (All Weather)
 * y la perspectiva 2026 de BlackRock (IA, emergentes y 1-2% en bitcoin para carteras diversificadas).
 */
export type ModelPortfolio = { id: string; cat: 'conservador' | 'medio' | 'alto'; profile: 'conservador' | 'moderado' | 'arriesgado'; name: string; by: string; idea: string; mix: { t: string; pct: number }[] };
export const PORTFOLIOS: ModelPortfolio[] = [
  { id: 'colchon', cat: 'conservador', profile: 'conservador', name: 'Colchón que rinde', by: 'Estilo Vanguard 30/70',
    idea: 'Siete de cada diez dólares en bonos y letras para que las caídas duelan poco.',
    mix: [{ t: 'BND', pct: 30 }, { t: 'SGOV', pct: 20 }, { t: 'VTI', pct: 15 }, { t: 'SCHP', pct: 10 }, { t: 'SCHD', pct: 10 }, { t: 'VXUS', pct: 5 }, { t: 'GLD', pct: 5 }, { t: 'JNJ', pct: 5 }] },
  { id: 'todoclima', cat: 'conservador', profile: 'conservador', name: 'Todo clima', by: 'Inspirada en Ray Dalio',
    idea: 'Repartida para aguantar crecimiento, recesión, inflación o deflación.',
    mix: [{ t: 'TLT', pct: 40 }, { t: 'VTI', pct: 30 }, { t: 'IEF', pct: 15 }, { t: 'GLD', pct: 8 }, { t: 'DBC', pct: 7 }] },
  { id: 'bogle', cat: 'medio', profile: 'moderado', name: 'Tres fondos', by: 'John Bogle, 70/30',
    idea: 'Todo EE.UU., todo el mundo y bonos. Simple, barata y difícil de mejorar.',
    mix: [{ t: 'VTI', pct: 42 }, { t: 'BND', pct: 30 }, { t: 'VXUS', pct: 28 }] },
  { id: 'yale', cat: 'medio', profile: 'moderado', name: 'Estilo Yale', by: 'David Swensen',
    idea: 'Acciones del mundo, inmobiliarias y bonos del Tesoro que se ajustan por inflación.',
    mix: [{ t: 'VTI', pct: 30 }, { t: 'VNQ', pct: 20 }, { t: 'VXUS', pct: 15 }, { t: 'IEF', pct: 15 }, { t: 'SCHP', pct: 15 }, { t: 'VWO', pct: 5 }] },
  { id: 'ia', cat: 'alto', profile: 'arriesgado', name: 'Crecimiento con IA', by: 'Temas de BlackRock 2026',
    idea: 'Una base amplia y las empresas que construyen la inteligencia artificial.',
    mix: [{ t: 'VTI', pct: 40 }, { t: 'NVDA', pct: 10 }, { t: 'MSFT', pct: 10 }, { t: 'GOOGL', pct: 8 }, { t: 'AMZN', pct: 8 }, { t: 'TSM', pct: 7 }, { t: 'AVGO', pct: 7 }, { t: 'BTC-USD', pct: 5 }, { t: 'MELI', pct: 5 }] },
  { id: 'emergente', cat: 'alto', profile: 'arriesgado', name: 'Emergentes y cripto', by: 'Para los que se la juegan',
    idea: 'Apuesta a los países que más crecen y a la cripto, con una base en EE.UU.',
    mix: [{ t: 'VTI', pct: 35 }, { t: 'VWO', pct: 20 }, { t: 'BTC-USD', pct: 15 }, { t: 'MELI', pct: 10 }, { t: 'TSM', pct: 10 }, { t: 'ETH-USD', pct: 5 }, { t: 'VXUS', pct: 5 }] }
];

/** Categorías del simulador. */
export const CATEGORIES = [
  { id: 'conservador', label: 'Conservador' },
  { id: 'medio', label: 'Riesgo medio' },
  { id: 'alto', label: 'Riesgo alto' }
] as const;

export const RISK_LABEL = ['', 'Bajo', 'Medio', 'Alto', 'Muy alto'] as const;
/** Tope para proyectar: ninguna inversión crece al ritmo de su mejor década para siempre. */
export const PROJECTION_CAP = 15;
export const PROFILE_CAP = { conservador: 6, moderado: 8, arriesgado: 11 } as const;
export type Profile = keyof typeof PROFILE_CAP;
