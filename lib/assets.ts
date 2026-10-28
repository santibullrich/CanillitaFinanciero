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

/**
 * Tres carteras modelo de 10 activos, basadas en cómo arman carteras los profesionales:
 * - Conservadora: estilo Vanguard LifeStrategy Conservative (≈40% acciones / 60% bonos y refugio)
 *   con ideas del All Weather de Ray Dalio (bonos del Tesoro y oro) y de David Swensen (bonos que ajustan por inflación).
 * - Moderada: la cartera de tres fondos de John Bogle (EE.UU. + mundo + bonos) llevada a ≈70/30,
 *   con inmobiliarias como Swensen, algo de oro y un 2% de bitcoin (el rango de 1-2% que sugiere BlackRock).
 * - Arriesgada: ≈90% acciones, base amplia más las empresas de inteligencia artificial y emergentes
 *   que destaca la perspectiva 2026 de BlackRock, y bitcoin como apuesta acotada.
 */
export type ModelPortfolio = { id: 'conservador' | 'medio' | 'alto'; profile: 'conservador' | 'moderado' | 'arriesgado'; label: string; idea: string; mix: { t: string; pct: number; role: string }[] };
export const PORTFOLIOS: ModelPortfolio[] = [
  {
    id: 'conservador', profile: 'conservador', label: 'Conservador',
    idea: 'Cuidar la plata primero. Más de la mitad en bonos, letras y oro para que las caídas duelan poco, y el resto en empresas estables que pagan dividendos.',
    mix: [
      { t: 'BND', pct: 20, role: 'Base de bonos' }, { t: 'VTI', pct: 15, role: 'Todo EE.UU.' }, { t: 'SGOV', pct: 10, role: 'Colchón que rinde' },
      { t: 'IEF', pct: 10, role: 'Seguro para crisis' }, { t: 'SCHP', pct: 10, role: 'Contra la inflación' }, { t: 'SCHD', pct: 10, role: 'Dividendos' },
      { t: 'VXUS', pct: 8, role: 'Resto del mundo' }, { t: 'GLD', pct: 7, role: 'Refugio' }, { t: 'JNJ', pct: 5, role: 'Salud estable' }, { t: 'KO', pct: 5, role: 'Consumo estable' }
    ]
  },
  {
    id: 'medio', profile: 'moderado', label: 'Riesgo medio',
    idea: 'Crecer sin sobresaltos grandes. Siete de cada diez dólares en acciones de todo el mundo y tres en bonos, inmobiliarias y oro, más una pizca de bitcoin.',
    mix: [
      { t: 'VTI', pct: 34, role: 'Todo EE.UU.' }, { t: 'VXUS', pct: 15, role: 'Resto del mundo' }, { t: 'BND', pct: 15, role: 'Base de bonos' },
      { t: 'BRK-B', pct: 7, role: 'Estilo Buffett' }, { t: 'MSFT', pct: 7, role: 'Tecnología sólida' }, { t: 'SCHP', pct: 5, role: 'Contra la inflación' },
      { t: 'VNQ', pct: 5, role: 'Inmobiliario' }, { t: 'VWO', pct: 5, role: 'Emergentes' }, { t: 'GLD', pct: 5, role: 'Refugio' }, { t: 'BTC-USD', pct: 2, role: 'Pizca de cripto' }
    ]
  },
  {
    id: 'alto', profile: 'arriesgado', label: 'Riesgo alto',
    idea: 'Buscar el mayor crecimiento a largo plazo, aceptando caídas fuertes en el camino. Casi todo en acciones: una base amplia y las empresas de la inteligencia artificial.',
    mix: [
      { t: 'VTI', pct: 32, role: 'Base amplia' }, { t: 'NVDA', pct: 10, role: 'Chips de IA' }, { t: 'VWO', pct: 10, role: 'Emergentes' },
      { t: 'MSFT', pct: 8, role: 'Nube e IA' }, { t: 'BTC-USD', pct: 8, role: 'Cripto' }, { t: 'GOOGL', pct: 7, role: 'Buscador e IA' },
      { t: 'AMZN', pct: 7, role: 'Comercio y nube' }, { t: 'MELI', pct: 7, role: 'América Latina' }, { t: 'TSM', pct: 6, role: 'Fábrica de chips' }, { t: 'AVGO', pct: 5, role: 'Redes para IA' }
    ]
  }
];

/** Categorías del simulador (una por cartera modelo). */
export const CATEGORIES = PORTFOLIOS.map((p) => ({ id: p.id, label: p.label }));

export const RISK_LABEL = ['', 'Bajo', 'Medio', 'Alto', 'Muy alto'] as const;
/** Tope para proyectar: ninguna inversión crece al ritmo de su mejor década para siempre. */
export const PROJECTION_CAP = 15;
export const PROFILE_CAP = { conservador: 6, moderado: 8, arriesgado: 11 } as const;
export type Profile = keyof typeof PROFILE_CAP;
