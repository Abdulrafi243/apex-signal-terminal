import { useCallback, useEffect, useRef } from 'react'
import { BellRing, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { api, type NotificationItem } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function NotificationCenter({open,onClose}:{open:boolean;onClose:()=>void}) {
  const loader=useCallback(()=>api.notifications(false,80),[])
  const {data,loading,error,refresh}=usePolling(loader,7000,true)
  const items=data?.items||[]
  const seen=useRef<Set<number>>(new Set())

  useEffect(()=>{
    if(!data) return
    for(const n of data.items){
      if(seen.current.has(n.id)) continue
      seen.current.add(n.id)
      if(!n.read && typeof Notification !== 'undefined' && Notification.permission==='granted'){
        new Notification(n.title,{body:n.message,tag:`apex-${n.id}`})
      }
    }
  },[data])

  if (!open) return null
  const mark=async(id:number)=>{await api.markNotificationRead(id);await refresh()}
  return <><button onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" aria-label="Close notifications"/><aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/[0.07] bg-[#090d13] shadow-2xl">
    <div className="flex h-20 items-center justify-between border-b border-white/[0.06] px-5"><div><div className="text-sm font-semibold text-white">Notification Center</div><div className="mt-1 text-[10px] text-slate-500">Backend-synced signals, news locks and risk events</div></div><div className="flex gap-2"><button className="icon-btn" onClick={refresh}><RefreshCw size={15}/></button><button className="icon-btn" onClick={onClose}><X size={16}/></button></div></div>
    <div className="h-[calc(100%-9rem)] overflow-y-auto space-y-2 p-4">{loading&&<div className="text-xs text-slate-500">Loading notifications…</div>}{error&&<div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs text-amber-300">{error}</div>}{!loading&&!error&&items.map(n=><NotificationRow key={n.id} item={n} onRead={mark}/>)}{!loading&&!error&&items.length===0&&<div className="py-10 text-center text-xs text-slate-600">No notifications yet.</div>}</div>
    <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-[#090d13] p-4"><div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><CheckCircle2 size={15}/> Live notification sync active</div></div></div>
  </aside></>
}

function NotificationRow({item,onRead}:{item:NotificationItem;onRead:(id:number)=>Promise<void>}){
  const unread=!item.read
  return <button onClick={()=>onRead(item.id)} className={`w-full rounded-2xl border p-4 text-left ${unread?'border-emerald-400/15 bg-emerald-400/[0.04]':'border-white/[0.06] bg-white/[0.02]'}`}><div className="flex gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unread?'bg-emerald-400/10 text-emerald-300':'bg-white/[0.04] text-slate-500'}`}><BellRing size={16}/></div><div className="min-w-0"><div className="text-xs font-semibold text-white">{item.title}</div><p className="mt-1 text-[11px] leading-5 text-slate-500">{item.message}</p><div className="mt-2 text-[9px] uppercase tracking-wider text-slate-700">{new Date(item.created_at).toLocaleString()} • {item.severity}</div></div></div></button>
}
