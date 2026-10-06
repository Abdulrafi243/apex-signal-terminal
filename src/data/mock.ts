import type { ChecklistItem, Signal } from '../types/trading'

export const activeSignal: Signal = {
  symbol: 'BTCUSDT',
  direction: 'LONG',
  quality: 'A+',
  score: 91,
  entry: '68,240 — 68,360',
  stopLoss: '67,870',
  takeProfits: ['68,980', '69,620', '70,450'],
  rr: '1 : 3.4',
  setup: 'SSL Sweep → CHoCH → Displacement → FVG Retest',
  newsRisk: 'LOW',
  session: 'London / New York overlap',
}

export const checklist: ChecklistItem[] = [
  { label: 'Higher-timeframe bias', status: 'pass', note: '4H and 1H structure bullish' },
  { label: 'Liquidity event', status: 'pass', note: 'Sell-side liquidity swept' },
  { label: 'Structure confirmation', status: 'pass', note: 'Bullish CHoCH + BOS confirmed' },
  { label: 'Displacement', status: 'pass', note: 'Impulse closed above internal high' },
  { label: 'Fair Value Gap', status: 'pass', note: '5M bullish FVG partially mitigated' },
  { label: 'Order Block', status: 'pass', note: 'Demand OB aligned with discount zone' },
  { label: 'Volume confirmation', status: 'pass', note: 'Expansion volume above 20-bar mean' },
  { label: 'News filter', status: 'pass', note: 'No high-impact event inside risk window' },
  { label: 'Risk / Reward', status: 'pass', note: 'Projected R:R above minimum threshold' },
  { label: '1M micro structure', status: 'warn', note: 'Optional precision confirmation pending' },
]

export const mtfRows = [
  ['1D', 'Bullish', 'HH / HL', 'Premium pullback', 'BUY BIAS'],
  ['4H', 'Bullish', 'BOS', 'Discount', 'BUY'],
  ['1H', 'Bullish', 'HL intact', 'Demand', 'BUY'],
  ['30M', 'Bullish', 'MSS', 'Repricing', 'BUY'],
  ['15M', 'Bullish', 'CHoCH', 'FVG retest', 'ENTRY'],
  ['5M', 'Bullish', 'BOS', 'OB + FVG', 'CONFIRMED'],
  ['1M', 'Neutral', 'Internal', 'Noise', 'OPTIONAL'],
]

export const watchlist = [
  ['XAUUSD', '2,642.40', '+0.82%', '88', 'LONG'],
  ['BTCUSDT', '68,311', '+2.16%', '91', 'LONG'],
  ['ETHUSDT', '3,641', '+1.42%', '79', 'WAIT'],
  ['SOLUSDT', '171.24', '-0.64%', '84', 'SHORT'],
  ['BNBUSDT', '598.60', '+0.27%', '72', 'WAIT'],
  ['PEPEUSDT', '0.00001178', '+4.03%', '82', 'LONG'],
]

export const newsItems = [
  { time: '18:00', label: 'USD • ISM Services PMI', impact: 'HIGH', countdown: '01:32:14' },
  { time: '19:30', label: 'USD • Fed speaker', impact: 'MEDIUM', countdown: '03:02:14' },
  { time: '22:00', label: 'Crypto • ETF flow update', impact: 'MEDIUM', countdown: '05:32:14' },
]
