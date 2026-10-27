// Prueba rápida de Yahoo Finance desde tu compu: npm run check:datos
import yahooFinance from 'yahoo-finance2';
const NV = { validateResult: false };
try { yahooFinance.suppressNotices?.(['yahooSurvey', 'ripHistorical']); } catch {}

const tests = [
  ['Cotizaciones de varias bolsas', () => yahooFinance.quote(['AAPL', 'GGAL.BA', '7203.T', 'PETR4.SA', 'SAP.DE', 'SHEL.L', '^MERV', 'BTC-USD'], {}, NV), (r) => r.length],
  ['Buscador', () => yahooFinance.search('galicia', { quotesCount: 5, newsCount: 0 }, NV), (r) => r.quotes?.length],
  ['Más suben hoy', () => yahooFinance.screener({ scrIds: 'day_gainers', count: 5 }, NV), (r) => r.quotes?.length],
  ['Ficha de empresa', () => yahooFinance.quoteSummary('AAPL', { modules: ['price', 'assetProfile', 'summaryDetail', 'financialData', 'recommendationTrend'] }, NV), (r) => (r.assetProfile?.sector ? 1 : 0)],
  ['Noticias', () => yahooFinance.search('AAPL', { quotesCount: 0, newsCount: 3 }, NV), (r) => r.news?.length],
  ['Gráfico', () => yahooFinance.chart('AAPL', { period1: new Date(Date.now() - 5 * 864e5), interval: '5m' }, NV), (r) => r.quotes?.length]
];
let fails = 0;
for (const [name, fn, n] of tests) {
  try {
    const r = await fn();
    const k = n(r) || 0;
    if (!k) fails++;
    console.log(`${k ? 'OK   ' : 'FALLA'} ${name}${k ? ` (${k})` : ''}`);
  } catch (e) {
    fails++;
    console.log(`FALLA ${name}: ${e.message}`);
  }
}
console.log(fails ? `\n${fails} pruebas fallaron.` : '\nTodo en orden.');
process.exit(fails ? 1 : 0);
