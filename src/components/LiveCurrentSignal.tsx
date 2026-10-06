import { useCallback } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function LiveCurrentSignal({symbol,timeframe}:{symbol:string;timeframe:string}){
  const loader=useCallback(()=>api.signal(symbol,timeframe),[symbol,timeframe])
  const {data,loading,error,refresh}=usePolling(loader,3000)
  if(loading)return <Box>Analyzing {symbol} {timeframe}…</Box>
  if(error && !data)return <Box><span className="flex items-center gap-2 text-amber-300"><AlertCircle size={14}/>{error}</span></Box>
  if(!data)return <Box>No signal data.</Box>

  const action=String(data.action||'NO TRADE')
  const live=action==='BUY NOW'||action==='SELL NOW'
  const wait=action.startsWith('WAIT')
  const actionTone=action==='BUY NOW'?'text-emerald-300':action==='SELL NOW'?'text-rose-300':wait?'text-amber-300':'text-slate-300'
  const score=Number(data.score||0)
  const scoreLabel=score>=92?'A+ QUALITY':score>=88?'STRONG':score>=70?'VALID':'BELOW SIGNAL THRESHOLD'
  const executable=action==='BUY NOW'||action==='SELL NOW'||action==='WAIT FOR ENTRY'

  return <div className={`rounded-2xl border p-4 ${live?'border-emerald-400/20 bg-emerald-400/[0.05]':wait?'border-amber-400/20 bg-amber-400/[0.04]':'border-white/[0.07] bg-white/[0.02]'}`}>
    {error&&<div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[10px] text-amber-200"><AlertCircle size={12}/>{error} Showing the last valid analysis.</div>}
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-[10px] font-black ${live?'bg-emerald-400 text-black':wait?'bg-amber-300 text-black':'bg-white/[0.07] text-slate-400'}`}>{data.grade} • {scoreLabel}</span>
          <span className="text-xs text-slate-500">{symbol} • {timeframe}</span>
        </div>
        <div className={`mt-3 text-3xl font-black ${actionTone}`}>{action}</div>
        <div className="mt-1 text-[11px] text-slate-500">{data.decision_reason||'Current-market decision engine'}</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">Decision refresh: every 3s • Live price: WebSocket stream</div>
      </div>
      <button className="icon-btn" onClick={refresh}><RefreshCw size={14}/></button>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 text-xs lg:grid-cols-4">
      <Metric label="Quality score" value={`${score}/100`}/>
      <Metric label="Signal threshold" value={`${data.signal_threshold??70}/100`}/>
      <Metric label="Current" value={fmt(data.current_price)}/>
      <Metric label="News" value={data.news_risk||'UNKNOWN'}/>
      <Metric label="Entry" value={executable?range(data.entry_low,data.entry_high):'No active trade plan'}/>
      <Metric label="Stop loss" value={executable?fmt(data.stop_loss):'—'}/>
      <Metric label="R:R" value={executable&&data.rr?`1:${Number(data.rr).toFixed(2)}`:'—'}/>
      <Metric label="TP1 / TP2 / TP3" value={executable?(data.take_profits||[]).map(fmt).join(' / ')||'—':'—'}/>
    </div>

    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white"><ShieldCheck size={14} className={live?'text-emerald-300':'text-slate-500'}/> Professional core gate</div>
        <p className="text-[11px] leading-5 text-slate-400">{(data.core_confirmations||[]).join(' • ')||'No core confirmations passed yet.'}</p>
        {!!data.missing_confirmations?.length&&<p className="mt-2 text-[10px] leading-5 text-amber-300">Waiting for: {data.missing_confirmations.join(' • ')}</p>}
      </div>
      <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white"><CheckCircle2 size={14} className="text-slate-500"/> Secondary confluence</div>
        <p className="text-[11px] leading-5 text-slate-400">{(data.secondary_confirmations||[]).join(' • ')||'No extra secondary confluence.'}</p>
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/20 p-3"><div className="mb-2 text-xs font-semibold text-white">Engine rationale</div><p className="text-[11px] leading-5 text-slate-400">{(data.setup||[]).join(' • ')}</p></div>
  </div>
}
function Box({children}:{children:React.ReactNode}){return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-xs text-slate-500">{children}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3"><div className="text-[9px] uppercase tracking-wider text-slate-600">{label}</div><div className="mt-1 font-semibold text-slate-200">{value}</div></div>}
function fmt(v:number|null|undefined){return v==null?'—':v.toLocaleString(undefined,{maximumFractionDigits:v<1?8:2})}
function range(a:number|null,b:number|null){return a!=null&&b!=null?`${fmt(a)} – ${fmt(b)}`:'—'}
