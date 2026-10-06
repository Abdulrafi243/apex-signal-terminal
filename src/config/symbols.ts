export const forexSymbols = [
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', group: 'Metals' },
  { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', group: 'Crypto CFD' },
]

export const futuresSymbols = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','TRXUSDT','DOTUSDT','LTCUSDT','BCHUSDT','SUIUSDT','APTUSDT','ARBUSDT','OPUSDT','NEARUSDT','FILUSDT','ATOMUSDT','INJUSDT','AAVEUSDT','UNIUSDT','ETCUSDT','TONUSDT','SHIBUSDT','WIFUSDT','BONKUSDT','FLOKIUSDT','PEPEUSDT'
].map(symbol => ({ symbol, name: symbol.replace('USDT',' / USDT'), group: 'Binance Futures' }))
