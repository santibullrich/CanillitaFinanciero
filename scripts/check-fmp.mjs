// Prueba rápida de todos los endpoints de FMP que usa la app.
// Uso: FMP_API_KEY=tu_clave npm run check:fmp   (o con la clave en .env.local)
import { readFileSync, existsSync } from 'node:fs';

if (!process.env.FMP_API_KEY && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*FMP_API_KEY\s*=\s*(.+)\s*$/);
    if (m) process.env.FMP_API_KEY = m[1].replace(/^["']|["']$/g, '');
  }
}
const key = process.env.FMP_API_KEY;
if (!key) { console.error('Falta FMP_API_KEY'); process.exit(1); }

const B = 'https://financialmodelingprep.com/stable';
const tests = [
  ['Búsqueda por ticker', '/search-symbol?query=GGAL', ['symbol', 'name', 'exchange']],
  ['Búsqueda por nombre', '/search-name?query=galicia', ['symbol', 'name']],
  ['Cotización', '/quote?symbol=AAPL', ['price', 'changePercentage', 'marketCap', 'previousClose', 'yearHigh', 'priceAvg50']],
  ['Cotización en lote', '/batch-quote?symbols=AAPL,7203.T,PETR4.SA,GGAL.BA', ['symbol', 'price']],
  ['Índices', '/batch-quote?symbols=^GSPC,^STOXX50E,^N225,^HSI,^BVSP,^MERV', ['symbol', 'price']],
  ['Bolsa entera (Merval)', '/batch-exchange-quote?exchange=BUE&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Tokio)', '/batch-exchange-quote?exchange=JPX&short=false', ['symbol', 'price', 'marketCap']],
  ['Cripto', '/batch-crypto-quotes?short=false', ['symbol', 'price', 'marketCap']],
  ['Perfil', '/profile?symbol=AAPL', ['companyName', 'website', 'sector', 'currency', 'description']],
  ['Precio objetivo', '/price-target-consensus?symbol=AAPL', ['targetConsensus', 'targetHigh', 'targetLow']],
  ['Consenso de analistas', '/grades-consensus?symbol=AAPL', ['strongBuy', 'buy', 'hold', 'sell', 'strongSell']],
  ['Ratios', '/ratios-ttm?symbol=AAPL', ['priceToEarningsRatioTTM', 'dividendYieldTTM']],
  ['Noticias', '/news/stock?symbols=AAPL&limit=3', ['title', 'url', 'site', 'publishedDate']],
  ['Noticias cripto', '/news/crypto?symbols=BTCUSD&limit=3', ['title', 'url']],
  ['Histórico diario', '/historical-price-eod/light?symbol=AAPL&from=2025-01-01', ['date', 'price']],
  ['Intradiario 5 min', '/historical-chart/5min?symbol=AAPL', ['date', 'close']],
  ['Tipo de cambio', '/batch-quote?symbols=EURUSD,USDARS,USDJPY', ['symbol', 'price']],
  ['Bolsa entera (Nueva York)', '/batch-exchange-quote?exchange=NYSE&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (NASDAQ)', '/batch-exchange-quote?exchange=NASDAQ&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Londres)', '/batch-exchange-quote?exchange=LSE&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Toronto)', '/batch-exchange-quote?exchange=TSX&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (México)', '/batch-exchange-quote?exchange=MEX&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Fráncfort)', '/batch-exchange-quote?exchange=XETRA&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Euronext)', '/batch-exchange-quote?exchange=EURONEXT&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Milán)', '/batch-exchange-quote?exchange=MIL&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Madrid)', '/batch-exchange-quote?exchange=BME&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Suiza)', '/batch-exchange-quote?exchange=SIX&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (India)', '/batch-exchange-quote?exchange=NSE&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Shanghái)', '/batch-exchange-quote?exchange=SHH&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Shenzhen)', '/batch-exchange-quote?exchange=SHZ&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Hong Kong)', '/batch-exchange-quote?exchange=HKSE&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Corea)', '/batch-exchange-quote?exchange=KSC&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Taiwán)', '/batch-exchange-quote?exchange=TAI&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (Australia)', '/batch-exchange-quote?exchange=ASX&short=false', ['symbol', 'price', 'marketCap']],
  ['Bolsa entera (San Pablo)', '/batch-exchange-quote?exchange=SAO&short=false', ['symbol', 'price', 'marketCap']],
  ['Índices nuevos', '/batch-quote?symbols=^FTSE,^GSPTSE,^MXX,^SSMI,^NSEI,000001.SS,^KS11,^TWII,^AXJO', ['symbol', 'price']],
  ['Screener por rubro', '/company-screener?exchange=NASDAQ&sector=Technology&limit=5', ['symbol', 'sector']]
];

let fails = 0;
for (const [name, path, fields] of tests) {
  const url = `${B}${path}${path.includes('?') ? '&' : '?'}apikey=${key}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const row = Array.isArray(j) ? j[0] : j;
    const missing = row ? fields.filter((f) => !(f in row)) : fields;
    const ok = r.ok && row && !missing.length;
    if (!ok) fails++;
    console.log(`${ok ? 'OK   ' : 'FALLA'} ${name} (${r.status}${Array.isArray(j) ? `, ${j.length} filas` : ''})${missing.length ? ' · faltan campos: ' + missing.join(', ') : ''}${!row ? ' · sin datos' : ''}${j?.['Error Message'] ? ' · ' + j['Error Message'] : ''}`);
  } catch (e) {
    fails++;
    console.log(`FALLA ${name}: ${e.message}`);
  }
}
console.log(fails ? `\n${fails} pruebas fallaron. Si es por el plan, revisá qué incluye tu suscripción de FMP; si es un campo, corregilo en lib/fmp.ts.` : '\nTodo en orden.');
process.exit(fails ? 1 : 0);
