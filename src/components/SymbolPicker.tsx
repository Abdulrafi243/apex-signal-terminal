import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type { MarketMode } from '../types/trading'
import { forexSymbols, futuresSymbols } from '../config/symbols'

export function SymbolPicker({ market, symbol, setSymbol }: { market: MarketMode; symbol: string; setSymbol: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const source = market === 'FOREX' ? forexSymbols : futuresSymbols
  const filtered = useMemo(() => source.filter(x => `${x.symbol} ${x.name}`.toLowerCase().includes(query.toLowerCase())), [source, query])

  return <div className="relative">
    <button className="selector min-w-44" onClick={() => setOpen(v => !v)}>
      <div className="text-left"><div className="text-[10px] uppercase tracking-wider text-slate-500">Symbol</div><div className="mt-0.5 text-sm font-semibold text-white">{symbol}</div></div>
      <ChevronDown size={16} className="text-slate-500"/>
    </button>
    {open && <>
      <button aria-label="Close symbol menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)}/>
      <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[330px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1017] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.06] p-3"><Search size={15} className="text-slate-500"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search symbol..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600"/><button onClick={()=>setQuery('')} className="text-slate-600 hover:text-white"><X size={14}/></button></div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map(item => <button key={item.symbol} onClick={() => { setSymbol(item.symbol); setOpen(false); setQuery('') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.04]">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-[10px] font-black text-emerald-300">{item.symbol.slice(0,2)}</div>
            <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-white">{item.symbol}</div><div className="truncate text-[10px] text-slate-600">{item.name}</div></div>
            {symbol===item.symbol && <Check size={15} className="text-emerald-300"/>}
          </button>)}
        </div>
      </div>
    </>}
  </div>
}
