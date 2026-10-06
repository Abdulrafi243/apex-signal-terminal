import { useCallback } from 'react'
import { api } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function LiveUpcomingRisk(){
  const {data,loading,error}=usePolling(useCallback(()=>api.calendar(6,36),[]),60000)
  if(loading)return <Box>Loading economic calendar…</Box>
  if(error)return <Box>Calendar unavailable.</Box>
  const items=(data?.items||[]).slice(0,5)
  if(!items.length)return <Box>No provider events in the current window.</Box>
  return <div className="space-y-2">{items.map((n:any,i:number)=><div key={`${n.datetime}-${i}`} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"><div className="flex items-start justify-between gap-2"><div><div className="text-[10px] text-slate-500">{new Date(n.datetime).toLocaleString()}</div><div className="mt-1 text-xs font-medium text-slate-200">{n.currency?`${n.currency} • `:''}{n.title}</div></div><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${n.impact==='HIGH'?'bg-rose-400/10 text-rose-300':n.impact==='MEDIUM'?'bg-amber-400/10 text-amber-300':'bg-sky-400/10 text-sky-300'}`}>{n.impact}</span></div></div>)}</div>
}
function Box({children}:{children:React.ReactNode}){return <div className="rounded-xl border border-white/[0.05] p-4 text-xs text-slate-500">{children}</div>}
