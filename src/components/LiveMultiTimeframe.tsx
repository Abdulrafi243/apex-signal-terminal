import { useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function LiveMultiTimeframe({symbol,timeframe}:{symbol:string;timeframe:string}){
  const loader=useCallback(()=>api.multiTimeframe(symbol,timeframe),[symbol,timeframe])
  const {data,loading,error,refresh}=usePolling(loader,30000)
  if(loading&&!data)return <div className="p-4 text-xs text-slate-500">Loading multi-timeframe context…</div>
  if(error&&!data)return <div className="p-4 text-xs text-rose-300">MTF unavailable: {error}</div>
  return <div>
    <div className="mb-3 flex items-center justify-between"><div className="text-[10px] uppercase tracking-wider text-slate-600">Alignment <span className={`ml-2 font-bold ${data?.alignment==='BULLISH'?'text-emerald-300':data?.alignment==='BEARISH'?'text-rose-300':'text-amber-300'}`}>{data?.alignment||'—'}</span></div><button className="icon-btn" onClick={refresh}><RefreshCw size={13}/></button></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-600"><th className="pb-3">TF</th><th className="pb-3">Bias</th><th className="pb-3">Structure event</th><th className="pb-3">Decision</th></tr></thead><tbody>{(data?.items||[]).map(r=><tr key={r.timeframe} className="border-t border-white/[0.045]"><td className="py-3 font-semibold text-white">{r.timeframe}</td><td className={r.bias==='BULLISH'?'text-emerald-300':r.bias==='BEARISH'?'text-rose-300':'text-slate-400'}>{r.bias}</td><td className="text-slate-400">{r.event.replaceAll('_',' ')}</td><td><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${r.bias===data?.alignment?'bg-emerald-400/10 text-emerald-300':'bg-white/[0.04] text-slate-500'}`}>{r.bias===data?.alignment?'ALIGNED':'CONFLICT'}</span></td></tr>)}</tbody></table></div>
  </div>
}
