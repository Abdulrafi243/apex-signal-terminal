import { Bell, Search, Wifi } from 'lucide-react'
import { SymbolPicker } from './SymbolPicker'
import type { MarketMode, Timeframe } from '../types/trading'

const timeframes: Timeframe[] = ['1D', '4H', '1H', '30M', '15M', '5M', '1M']

export function Header({ market, setMarket, timeframe, setTimeframe, symbol, setSymbol, onNotifications }: {
  market: MarketMode
  setMarket: (v: MarketMode) => void
  timeframe: Timeframe
  setTimeframe: (v: Timeframe) => void
  symbol: string
  setSymbol: (v: string) => void
  onNotifications: () => void
}) {
  return (
    <header className="border-b border-white/[0.06] bg-[#0a0e14]/90 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="segmented">
          {(['FOREX', 'FUTURES'] as MarketMode[]).map((m) => (
            <button key={m} onClick={() => setMarket(m)} className={market === m ? 'seg-active' : ''}>{m}</button>
          ))}
        </div>

        <SymbolPicker market={market} symbol={symbol} setSymbol={setSymbol} />

        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-1">
          {timeframes.map((tf) => (
            <button key={tf} onClick={() => setTimeframe(tf)} className={`tf-btn ${timeframe === tf ? 'tf-active' : ''}`}>{tf}</button>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-slate-400">
            <Wifi size={14} className="text-emerald-400" /> DATA READY
          </div>
          <button className="icon-btn"><Search size={17} /></button>
          <button onClick={onNotifications} className="icon-btn relative"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-400" /></button>
        </div>
      </div>
    </header>
  )
}
