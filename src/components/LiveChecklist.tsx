import { useCallback } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function LiveChecklist({symbol,timeframe}:{symbol:string;timeframe:string}){
  const {data,loading,error}=usePolling(useCallback(()=>api.signal(symbol,timeframe),[symbol,timeframe]),20000)
  if(loading)return <Note>Building live decision checklist…</Note>
  if(error)return <Note>Checklist unavailable: {error}</Note>
  if(!data)return <Note>No live analysis.</Note>
  const reasons:string[]=data.setup||[]
  const rows=[
    ['Market structure',match(reasons,/market structure|BOS|CHOCH/i),'Structure / shift confirmation'],
    ['Liquidity',match(reasons,/liquidity|raid/i),'Sweep or previous-level liquidity event'],
    ['FVG / IFVG',match(reasons,/FVG|Fair Value Gap/i),'Imbalance confirmation'],
    ['Order Block',match(reasons,/order block/i),'Order-block confluence'],
    ['Displacement',match(reasons,/displacement/i),'Qualified impulsive move'],
    ['Higher timeframe',match(reasons,/Higher-timeframe/i),'HTF alignment'],
    ['News filter',data.news_risk==='LOW'?'pass':data.news_risk==='UNKNOWN'?'warn':'fail',`News risk: ${data.news_risk}`],
    ['Trade state',data.state==='LIVE'?'pass':data.state==='REVIEW'?'warn':'fail',`Engine state: ${data.state}`],
  ] as const
  return <div className="space-y-1.5">{rows.map(([label,status,note])=>{const Icon=status==='pass'?CheckCircle2:status==='warn'?AlertTriangle:XCircle; const cls=status==='pass'?'text-emerald-400':status==='warn'?'text-amber-400':'text-rose-400';return <div key={label} className="flex gap-3 rounded-xl border border-white/[0.045] bg-white/[0.018] p-3"><Icon size={16} className={`mt-0.5 shrink-0 ${cls}`}/><div><div className="text-xs font-medium text-slate-200">{label}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></div></div>})}</div>
}
function match(xs:string[],re:RegExp):'pass'|'warn'|'fail'{return xs.some(x=>re.test(x))?'pass':'warn'}
function Note({children}:{children:React.ReactNode}){return <div className="rounded-xl border border-white/[0.05] p-4 text-xs text-slate-500">{children}</div>}
