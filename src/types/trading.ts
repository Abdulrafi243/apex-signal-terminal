export type MarketMode = 'FOREX' | 'FUTURES'
export type Timeframe = '1D' | '4H' | '1H' | '30M' | '15M' | '5M' | '1M'
export type Direction = 'LONG' | 'SHORT' | 'WAIT'
export type PageKey = 'Dashboard' | 'Market Scanner' | 'Signals' | 'Smart Money' | 'News' | 'Economic Calendar' | 'Risk Manager' | 'Backtesting' | 'Trade Journal' | 'Alerts' | 'Settings'

export interface Signal {
  symbol: string
  direction: Direction
  quality: 'A+' | 'A' | 'B' | 'REJECT'
  score: number
  entry: string
  stopLoss: string
  takeProfits: string[]
  rr: string
  setup: string
  newsRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  session: string
}

export interface ChecklistItem {
  label: string
  status: 'pass' | 'warn' | 'fail'
  note: string
}
