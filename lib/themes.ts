export type Theme = { id: string; name: string; risk: 1 | 2 | 3 | 4 | 5; desc: string; note: string; symbols: string[]; feat?: boolean };

export const THEMES: Theme[] = [
  { id: 'ia', name: 'Inteligencia artificial', risk: 4, feat: true,
    desc: 'Las empresas que fabrican los chips, la nube y los programas que hacen funcionar la IA.',
    note: 'Crecen muy rápido y por eso se pagan caras. Cuando las expectativas no se cumplen, pueden caer fuerte en pocos días.',
    symbols: ['NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'ASML', 'AVGO', 'TSM', '9984.T', '0700.HK'] },
  { id: 'bigtech', name: 'Gigantes tech', risk: 3,
    desc: 'Las empresas más grandes del mundo. Las usás todos los días aunque no lo notes.',
    note: 'Ganan mucha plata y eso les da estabilidad, pero pesan tanto en los índices que cuando caen arrastran a todo el mercado.',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', '0700.HK', '9988.HK', '6758.T'] },
  { id: 'petroleo', name: 'Petróleo y gas', risk: 3,
    desc: 'Las que sacan, refinan y venden energía. Se mueven al ritmo del precio del barril.',
    note: 'Si el petróleo sube, ganan más; si baja, sufren. Muchas pagan buenos dividendos.',
    symbols: ['XOM', 'CVX', 'SHEL', 'TTE', 'PETR4.SA', 'YPF', 'VIST', 'PAM'] },
  { id: 'materias', name: 'Materias primas', risk: 3,
    desc: 'Mineras y productoras de hierro, cobre, oro, acero y aluminio.',
    note: 'Dependen mucho de cuánto compra China. Tienen ciclos: años muy buenos y años flojos.',
    symbols: ['BHP', 'RIO', 'VALE', 'FCX', 'NEM', 'TX', 'ALUA.BA'] },
  { id: 'espacio', name: 'Espacio', risk: 5,
    desc: 'Cohetes, satélites e internet desde el espacio.',
    note: 'Varias todavía no ganan plata. Pueden multiplicarse o desaparecer: es para una parte chica de lo que invertís.',
    symbols: ['RKLB', 'ASTS', 'LMT', 'NOC', 'BA', 'AIR.PA'] },
  { id: 'cuantica', name: 'Computación cuántica', risk: 5,
    desc: 'Computadoras que usan las reglas de la física cuántica para resolver problemas imposibles hoy.',
    note: 'La más especulativa de todas: saltos de 10% en un día son normales y todavía falta mucho para que sea un negocio grande.',
    symbols: ['IONQ', 'RGTI', 'QBTS', 'QUBT', 'IBM', 'GOOGL'] },
  { id: 'dividendos', name: 'Dividendos', risk: 2,
    desc: 'Empresas que reparten parte de lo que ganan entre sus accionistas, como un alquiler por tener la acción.',
    note: 'Suelen ser empresas maduras y más tranquilas. El dividendo no está garantizado: si a la empresa le va mal, lo puede recortar.',
    symbols: ['KO', 'PEP', 'JNJ', 'PG', 'XOM', 'VZ', 'PFE', 'JPM', 'TTE', 'ITUB', 'PETR4.SA', '0005.HK'] }
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id);

/** Universo base que mira el asesor y las "joyitas", además de lo que tenga el usuario. */
export const UNIVERSE = Array.from(new Set([
  ...THEMES.flatMap((t) => t.symbols),
  'BRK-B', 'LLY', 'V', 'MA', 'UNH', 'COST', 'WMT', 'NFLX', 'TSLA', 'ORCL', 'CRM', 'ADBE', 'MELI', 'GGAL', 'BMA', 'NU',
  'SAP', 'ASML', 'NVO', 'MC.PA', 'SIE.DE', '7203.T', '8306.T', '1211.HK', 'BTC-USD', 'ETH-USD', 'SOL-USD'
]));
