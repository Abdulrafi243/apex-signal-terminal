import { useCallback } from 'react'
import { Activity, BellRing, Database, ShieldCheck } from 'lucide-react'
import { api } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function ProductionHealth({symbol,timeframe}:{symbol:string;timeframe:string}){
  const healthLoader=useCallback(()=>api.dataHealth(symbol,timeframe),[symbol,timeframe])
  const channelLoader=useCallback(()=>api.notificationChannels(),[])
  const readinessLoader=useCallback(()=>api.readiness(),[])
  const health=usePolling(healthLoader,15000)
  const channels=usePolling(channelLoader,60000)
  const readiness=usePolling(readinessLoader,60000)
  const ok=health.data?.status==='OK'
  const feedValue=health.loading&&!health.data?'CHECKING':health.data?.status||(health.error?'CHECK':'UNKNOWN')
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
    <Card icon={Activity} label="Market feed" value={feedValue} good={ok}/>
    <Card icon={Database} label="Data age" value={health.data?.age_seconds==null?'—':`${health.data.age_seconds}s`} good={ok}/>
    <Card icon={BellRing} label="External alerts" value={channels.data?.telegram_configured||channels.data?.webhook_configured?'READY':'BROWSER'} good/>
    <Card icon={ShieldCheck} label="Trading mode" value={readiness.data?.checks?.automatic_trade_execution_enabled?'EXECUTION ON':'SIGNAL ONLY'} good={!readiness.data?.checks?.automatic_trade_execution_enabled}/>
  </div>
}
function Card({icon:Icon,label,value,good}:{icon:any;label:string;value:string;good?:boolean}){
  return <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"><div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-slate-600"><Icon size={12}/>{label}</div><div className={`mt-2 text-xs font-bold ${good?'text-emerald-300':'text-amber-300'}`}>{value}</div></div>
}
