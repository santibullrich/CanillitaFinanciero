import type { MarketId } from './markets';

/**
 * Las principales empresas (o monedas) de cada mercado, con el formato de símbolo de Yahoo Finance.
 * Yahoo no ofrece gratis la lista completa de una bolsa: con estas se arman los rankings,
 * el valor de cada mercado y la sección Explorar. Para sumar una empresa, agregá su símbolo acá.
 */
export const TOP: Record<MarketId, string[]> = {
  us: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO', 'JPM', 'LLY', 'V', 'WMT', 'XOM', 'UNH', 'MA', 'ORCL', 'COST', 'NFLX', 'HD',
    'PG', 'JNJ', 'ABBV', 'BAC', 'KO', 'CRM', 'AMD', 'CVX', 'MRK', 'PEP', 'TMO', 'ADBE', 'CSCO', 'MCD', 'WFC', 'ACN', 'IBM', 'GE', 'LIN', 'ABT',
    'QCOM', 'INTU', 'CAT', 'DIS', 'TXN', 'AMGN', 'PFE', 'VZ', 'GS', 'UBER', 'NOW', 'ISRG', 'PLTR', 'MU', 'INTC', 'BA', 'SBUX', 'NKE', 'MELI', 'PYPL'],
  ca: ['RY.TO', 'TD.TO', 'SHOP.TO', 'ENB.TO', 'CNR.TO', 'BN.TO', 'CP.TO', 'BMO.TO', 'BNS.TO', 'CNQ.TO', 'TRI.TO', 'ATD.TO', 'SU.TO', 'CM.TO', 'MFC.TO',
    'WCN.TO', 'CSU.TO', 'NTR.TO', 'ABX.TO', 'TRP.TO', 'SLF.TO', 'IFC.TO', 'L.TO', 'FTS.TO', 'AEM.TO'],
  mx: ['AMXB.MX', 'WALMEX.MX', 'GFNORTEO.MX', 'FEMSAUBD.MX', 'GMEXICOB.MX', 'CEMEXCPO.MX', 'BIMBOA.MX', 'GAPB.MX', 'ASURB.MX', 'KOFUBL.MX',
    'OMAB.MX', 'AC.MX', 'ELEKTRA.MX', 'KIMBERA.MX', 'ORBIA.MX', 'TLEVISACPO.MX', 'GRUMAB.MX', 'ALSEA.MX', 'LABB.MX', 'GCARSOA1.MX'],
  br: ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA', 'WEGE3.SA', 'BBAS3.SA', 'B3SA3.SA', 'ITSA4.SA', 'SUZB3.SA', 'RENT3.SA', 'ELET3.SA',
    'PETR3.SA', 'BPAC11.SA', 'RDOR3.SA', 'EQTL3.SA', 'PRIO3.SA', 'RADL3.SA', 'JBSS3.SA', 'LREN3.SA', 'GGBR4.SA', 'CSAN3.SA', 'VIVT3.SA', 'SBSP3.SA', 'EMBR3.SA'],
  ar: ['GGAL.BA', 'YPFD.BA', 'PAMP.BA', 'BMA.BA', 'TXAR.BA', 'ALUA.BA', 'CEPU.BA', 'LOMA.BA', 'TGSU2.BA', 'BBAR.BA', 'SUPV.BA', 'CRES.BA', 'EDN.BA',
    'TECO2.BA', 'COME.BA', 'VALO.BA', 'BYMA.BA', 'TRAN.BA', 'TGNO4.BA', 'METR.BA', 'MIRG.BA', 'CVH.BA', 'HARG.BA'],
  uk: ['SHEL.L', 'AZN.L', 'HSBA.L', 'ULVR.L', 'BP.L', 'RIO.L', 'GSK.L', 'REL.L', 'DGE.L', 'BATS.L', 'LSEG.L', 'RR.L', 'BARC.L', 'LLOY.L', 'NG.L',
    'GLEN.L', 'VOD.L', 'TSCO.L', 'PRU.L', 'AAL.L', 'CPG.L', 'EXPN.L', 'BA.L', 'NWG.L', 'IMB.L'],
  eu: ['ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'TTE.PA', 'AIR.PA', 'SAN.MC', 'ALV.DE', 'OR.PA', 'RMS.PA', 'SU.PA', 'DTE.DE', 'IBE.MC', 'BNP.PA',
    'ENEL.MI', 'ISP.MI', 'SAF.PA', 'SAN.PA', 'EL.PA', 'CS.PA', 'MUV2.DE', 'BMW.DE', 'MBG.DE', 'VOW3.DE', 'BAS.DE', 'ADS.DE', 'IFX.DE', 'INGA.AS',
    'PRX.AS', 'UCG.MI', 'ITX.MC', 'BBVA.MC', 'RACE.MI', 'STLAM.MI', 'KER.PA', 'AI.PA', 'DG.PA'],
  ch: ['NESN.SW', 'NOVN.SW', 'ROG.SW', 'UBSG.SW', 'ZURN.SW', 'ABBN.SW', 'CFR.SW', 'SREN.SW', 'LONN.SW', 'GIVN.SW', 'HOLN.SW', 'SIKA.SW', 'ALC.SW',
    'PGHN.SW', 'GEBN.SW', 'SCMN.SW', 'LOGN.SW', 'KNIN.SW', 'SLHN.SW'],
  in: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'BHARTIARTL.NS', 'SBIN.NS', 'ITC.NS', 'LT.NS', 'HINDUNILVR.NS', 'BAJFINANCE.NS',
    'KOTAKBANK.NS', 'AXISBANK.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'HCLTECH.NS', 'ASIANPAINT.NS', 'TITAN.NS', 'WIPRO.NS', 'ULTRACEMCO.NS', 'NTPC.NS',
    'ONGC.NS', 'TATAMOTORS.NS', 'POWERGRID.NS', 'ADANIENT.NS'],
  cn: ['600519.SS', '601398.SS', '601288.SS', '601857.SS', '600036.SS', '300750.SZ', '000858.SZ', '601318.SS', '600900.SS', '002594.SZ', '601988.SS',
    '601939.SS', '600028.SS', '601166.SS', '000333.SZ', '600276.SS', '601012.SS', '000651.SZ', '002415.SZ', '600309.SS'],
  hk: ['0700.HK', '9988.HK', '0005.HK', '1299.HK', '0939.HK', '3690.HK', '1810.HK', '0941.HK', '2318.HK', '1211.HK', '0388.HK', '9618.HK', '1398.HK',
    '3988.HK', '0883.HK', '2020.HK', '9999.HK', '1024.HK', '9888.HK', '0016.HK', '0001.HK', '0011.HK', '2388.HK', '0002.HK', '0003.HK'],
  jp: ['7203.T', '6758.T', '8306.T', '6861.T', '9984.T', '9432.T', '8035.T', '6501.T', '7974.T', '4063.T', '8316.T', '9983.T', '6098.T', '4519.T',
    '8058.T', '8001.T', '6902.T', '7267.T', '6367.T', '4502.T', '9433.T', '8031.T', '6954.T', '6981.T', '7741.T', '8411.T', '4568.T', '6273.T', '6594.T', '7011.T'],
  kr: ['005930.KS', '000660.KS', '373220.KS', '207940.KS', '005380.KS', '035420.KS', '000270.KS', '068270.KS', '105560.KS', '051910.KS', '005490.KS',
    '006400.KS', '035720.KS', '055550.KS', '012330.KS', '028260.KS', '066570.KS', '003670.KS', '096770.KS', '032830.KS'],
  tw: ['2330.TW', '2317.TW', '2454.TW', '2308.TW', '2382.TW', '2881.TW', '2882.TW', '2412.TW', '2891.TW', '3711.TW', '2303.TW', '2886.TW', '1301.TW',
    '2002.TW', '1303.TW', '2884.TW', '3008.TW', '2357.TW', '5880.TW', '2892.TW'],
  au: ['BHP.AX', 'CBA.AX', 'CSL.AX', 'NAB.AX', 'WBC.AX', 'ANZ.AX', 'WES.AX', 'MQG.AX', 'FMG.AX', 'RIO.AX', 'WDS.AX', 'TLS.AX', 'GMG.AX', 'WOW.AX',
    'TCL.AX', 'ALL.AX', 'STO.AX', 'COL.AX', 'REA.AX', 'XRO.AX', 'QBE.AX', 'SUN.AX', 'NST.AX', 'JHX.AX', 'COH.AX'],
  cr: ['BTC-USD', 'ETH-USD', 'XRP-USD', 'BNB-USD', 'SOL-USD', 'DOGE-USD', 'ADA-USD', 'TRX-USD', 'LINK-USD', 'AVAX-USD', 'XLM-USD', 'DOT-USD',
    'LTC-USD', 'BCH-USD', 'SHIB-USD', 'HBAR-USD', 'NEAR-USD', 'ATOM-USD', 'XMR-USD', 'ETC-USD']
};
