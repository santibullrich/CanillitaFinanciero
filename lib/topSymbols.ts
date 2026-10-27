import type { MarketId } from './markets';

/**
 * Las empresas (o monedas) más grandes de cada mercado, con el formato de símbolo de FMP.
 * Se usan como respaldo cuando el plan de FMP no incluye la lista completa de una bolsa.
 */
export const TOP: Record<MarketId, string[]> = {
  us: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO', 'JPM', 'LLY', 'V', 'WMT', 'XOM', 'UNH', 'MA', 'ORCL', 'COST', 'NFLX', 'HD', 'AMD', 'PLTR', 'KO', 'BAC', 'CRM'],
  ca: ['RY.TO', 'TD.TO', 'SHOP.TO', 'ENB.TO', 'CNR.TO', 'BN.TO', 'CP.TO', 'BMO.TO', 'BNS.TO', 'CNQ.TO', 'TRI.TO', 'ATD.TO', 'SU.TO', 'CM.TO', 'MFC.TO'],
  mx: ['AMXB.MX', 'WALMEX.MX', 'GFNORTEO.MX', 'FEMSAUBD.MX', 'GMEXICOB.MX', 'CEMEXCPO.MX', 'BIMBOA.MX', 'GAPB.MX', 'ASURB.MX', 'KOFUBL.MX'],
  br: ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA', 'WEGE3.SA', 'BBAS3.SA', 'B3SA3.SA', 'ITSA4.SA', 'SUZB3.SA', 'RENT3.SA', 'ELET3.SA'],
  ar: ['GGAL.BA', 'YPFD.BA', 'PAMP.BA', 'BMA.BA', 'TXAR.BA', 'ALUA.BA', 'CEPU.BA', 'LOMA.BA', 'TGSU2.BA', 'BBAR.BA', 'SUPV.BA', 'CRES.BA', 'EDN.BA', 'TECO2.BA', 'COME.BA', 'VALO.BA', 'BYMA.BA', 'TRAN.BA'],
  uk: ['SHEL.L', 'AZN.L', 'HSBA.L', 'ULVR.L', 'BP.L', 'RIO.L', 'GSK.L', 'REL.L', 'DGE.L', 'BATS.L', 'LSEG.L', 'RR.L', 'BARC.L', 'LLOY.L', 'NG.L'],
  eu: ['ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'TTE.PA', 'AIR.PA', 'SAN.MC', 'ALV.DE', 'OR.PA', 'RMS.PA', 'SU.PA', 'DTE.DE', 'IBE.MC', 'BNP.PA', 'ENEL.MI', 'ISP.MI'],
  ch: ['NESN.SW', 'NOVN.SW', 'ROG.SW', 'UBSG.SW', 'ZURN.SW', 'ABBN.SW', 'CFR.SW', 'SREN.SW', 'LONN.SW', 'GIVN.SW'],
  in: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'BHARTIARTL.NS', 'SBIN.NS', 'ITC.NS', 'LT.NS', 'HINDUNILVR.NS'],
  cn: ['600519.SS', '601398.SS', '601288.SS', '601857.SS', '600036.SS', '300750.SZ', '000858.SZ', '601318.SS', '600900.SS', '002594.SZ'],
  hk: ['0700.HK', '9988.HK', '0005.HK', '1299.HK', '0939.HK', '3690.HK', '1810.HK', '0941.HK', '2318.HK', '1211.HK', '0388.HK', '9618.HK'],
  jp: ['7203.T', '6758.T', '8306.T', '6861.T', '9984.T', '9432.T', '8035.T', '6501.T', '7974.T', '4063.T', '8316.T', '9983.T'],
  kr: ['005930.KS', '000660.KS', '373220.KS', '207940.KS', '005380.KS', '035420.KS', '000270.KS', '068270.KS', '105560.KS', '051910.KS'],
  tw: ['2330.TW', '2317.TW', '2454.TW', '2308.TW', '2382.TW', '2881.TW', '2882.TW', '2412.TW', '2891.TW', '3711.TW'],
  au: ['BHP.AX', 'CBA.AX', 'CSL.AX', 'NAB.AX', 'WBC.AX', 'ANZ.AX', 'WES.AX', 'MQG.AX', 'FMG.AX', 'RIO.AX', 'WDS.AX', 'TLS.AX'],
  cr: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'BNBUSD', 'SOLUSD', 'DOGEUSD', 'ADAUSD', 'TRXUSD', 'LINKUSD', 'AVAXUSD', 'XLMUSD', 'DOTUSD', 'LTCUSD', 'BCHUSD']
};
