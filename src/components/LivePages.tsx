import { useCallback, useMemo, useState } from 'react'
import { AlertCircle, BellRing, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, type NotificationItem, type SignalHistoryItem, type TradeItem, type ScannerItem } from '../services/api'
import type { MarketMode, Timeframe } from '../types/trading'
import { usePolling } from '../lib/usePolling'
import { Panel } from './Panel'

function Shell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
  return <div className="mx-auto max-w-[1780px] space-y-4 p-4 lg:p-6"><div><div className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-400">LIVE API WORKSPACE</div><h1 className="text-2xl font-bold text-white lg:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{subtitle}</p></div>{children}</div>
}
function State({loading,error}:{loading:boolean;error:string|null}){if(loading)return <div className="panel text-xs text-slate-500">Loading backend data…</div>; if(error)return <div className="panel flex items-center gap-2 text-xs text-amber-300"><AlertCircle size={15}/>{error}</div>; return null}
function Metric({label,value,tone='normal'}:{label:string;value:string;tone?:'normal'|'good'|'bad'}){return <div className="panel"><div className="text-[10px] uppercase tracking-widest text-slate-600">{label}</div><div className={`mt-2 text-2xl font-bold ${tone==='good'?'text-emerald-300':tone==='bad'?'text-rose-300':'text-white'}`}>{value}</div></div>}


export function LiveMarketScannerPage({market,timeframe}:{market:MarketMode;timeframe:Timeframe}){
  const loader=useCallback(()=>api.scanner(market,timeframe) as Promise<{market:string;timeframe:string;count:number;items:ScannerItem[]}>,[market,timeframe])
  const {data,loading,error,refresh}=usePolling(loader,30000)
  const items=data?.items||[]
  const qualified=items.filter(x=>x.state==='LIVE'&&x.score>=70).length
  const rejected=items.filter(x=>x.state==='NO_TRADE'||x.grade==='REJECT').length
  return <Shell title="Market Scanner" subtitle={`${market} • ${timeframe} • backend-ranked confluence scan`}>
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Scanned" value={String(items.length)}/><Metric label="70+ live" value={String(qualified)} tone="good"/><Metric label="No trade" value={String(rejected)}/><Metric label="Refresh" value="30s"/></div>
    <State loading={loading} error={error}/>
    {!loading&&!error&&<Panel title="Live opportunity ranking" action={<button onClick={refresh} className="icon-btn" title="Refresh"><RefreshCw size={14}/></button>}><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-xs"><thead className="text-left text-[10px] uppercase tracking-wider text-slate-600"><tr>{['Asset','TF','Action','Score','Grade','Entry','TP1','Top confluence','RR','News','State'].map(x=><th key={x} className="border-b border-white/[0.06] px-3 py-3">{x}</th>)}</tr></thead><tbody>{items.map(x=><tr key={x.symbol+x.timeframe} className="border-b border-white/[0.04]"><td className="px-3 py-3 font-semibold text-white">{x.symbol}</td><td className="px-3 py-3">{x.timeframe}</td><td className={`px-3 py-3 ${x.action==='BUY NOW'?'text-emerald-300':x.action==='SELL NOW'?'text-rose-300':String(x.action||'').startsWith('WAIT')?'text-amber-300':'text-slate-500'}`}>{x.action||x.direction}</td><td className="px-3 py-3 font-bold text-white">{x.score}</td><td className="px-3 py-3">{x.grade}</td><td className="px-3 py-3 text-slate-400">{fmtRange(x.entry_low,x.entry_high)}</td><td className="px-3 py-3 text-emerald-300">{fmt(x.take_profits?.[0])}</td><td className="max-w-[300px] truncate px-3 py-3 text-slate-400">{x.setup?.slice(0,3).join(' + ')||'—'}</td><td className="px-3 py-3">{x.rr?`1:${Number(x.rr).toFixed(2)}`:'—'}</td><td className="px-3 py-3">{x.news_risk||'—'}</td><td className={`px-3 py-3 ${x.state==='LIVE'?'text-emerald-300':x.state==='REVIEW'?'text-amber-300':'text-slate-500'}`}>{x.state}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="No scanner results returned."/>}</div></Panel>}
  </Shell>
}

export function LiveSignalsPage(){
  const loader=useCallback(()=>api.signalHistory(150),[])
  const {data,loading,error,refresh}=usePolling(loader,12000)
  const items=data?.items||[]
  const aplus=items.filter(x=>x.grade==='A+').length
  return <Shell title="Signals & History" subtitle="Persisted backend signals with setup context, levels and news state">
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Stored signals" value={String(items.length)}/><Metric label="A+ setups" value={String(aplus)} tone="good"/><Metric label="Latest score" value={items[0]?`${items[0].score}/100`:'—'}/><Metric label="Backend" value={error?'OFFLINE':'SYNCED'} tone={error?'bad':'good'}/></div>
    <State loading={loading} error={error}/>
    {!loading&&!error&&<Panel title="Live signal history" action={<button onClick={refresh} className="icon-btn" title="Refresh"><RefreshCw size={14}/></button>}><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-xs"><thead className="text-left text-[10px] uppercase tracking-wider text-slate-600"><tr>{['Time','Symbol','TF','Side','Grade','Score','Entry','SL','TP1','TP2','TP3','RR','News','State'].map(x=><th key={x} className="border-b border-white/[0.06] px-3 py-3">{x}</th>)}</tr></thead><tbody>{items.map((s:SignalHistoryItem)=><tr key={s.id} className="border-b border-white/[0.04]"><td className="px-3 py-3 text-slate-500">{new Date(s.created_at).toLocaleString()}</td><td className="px-3 py-3 font-semibold text-white">{s.symbol}</td><td className="px-3 py-3">{s.timeframe}</td><td className={`px-3 py-3 ${s.direction==='LONG'?'text-emerald-300':s.direction==='SHORT'?'text-rose-300':'text-slate-400'}`}>{s.direction}</td><td className="px-3 py-3 font-bold text-white">{s.grade}</td><td className="px-3 py-3">{s.score}</td><td className="px-3 py-3 text-slate-400">{fmtRange(s.entry_low,s.entry_high)}</td><td className="px-3 py-3 text-slate-400">{fmt(s.stop_loss)}</td><td className="px-3 py-3 text-emerald-300">{fmt(s.take_profits?.[0])}</td><td className="px-3 py-3 text-emerald-300">{fmt(s.take_profits?.[1])}</td><td className="px-3 py-3 text-emerald-300">{fmt(s.take_profits?.[2])}</td><td className="px-3 py-3">{s.rr?`1:${s.rr.toFixed(2)}`:'—'}</td><td className="px-3 py-3">{s.news_risk||'—'}</td><td className="px-3 py-3">{s.state}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="No persisted signals yet. Qualified signals will appear here automatically."/>}</div></Panel>}
  </Shell>
}

export function LiveJournalPage(){
  const loader=useCallback(()=>api.trades(150),[])
  const {data,loading,error,refresh}=usePolling(loader,15000)
  const items=data?.items||[]
  const pnl=items.reduce((a,t)=>a+(t.pnl||0),0)
  const closed=items.filter(t=>t.result!=='OPEN')
  const wins=closed.filter(t=>t.pnl>0).length
  const wr=closed.length?wins/closed.length*100:0
  return <Shell title="Trade Journal" subtitle="Persisted trades, outcomes and rule-audit context">
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Trades" value={String(items.length)}/><Metric label="Closed" value={String(closed.length)}/><Metric label="Win rate" value={`${wr.toFixed(1)}%`} tone={wr>=50?'good':'normal'}/><Metric label="Realized P/L" value={money(pnl)} tone={pnl>0?'good':pnl<0?'bad':'normal'}/></div>
    <State loading={loading} error={error}/>
    {!loading&&!error&&<Panel title="Journal database" action={<button onClick={refresh} className="icon-btn"><RefreshCw size={14}/></button>}><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-xs"><thead className="text-left text-[10px] uppercase tracking-wider text-slate-600"><tr>{['Opened','Symbol','TF','Side','Entry','SL','Exit','Grade','Score','RR','Result','P/L'].map(x=><th key={x} className="border-b border-white/[0.06] px-3 py-3">{x}</th>)}</tr></thead><tbody>{items.map((t:TradeItem)=><tr key={t.id} className="border-b border-white/[0.04]"><td className="px-3 py-3 text-slate-500">{new Date(t.created_at).toLocaleString()}</td><td className="px-3 py-3 font-semibold text-white">{t.symbol}</td><td className="px-3 py-3">{t.timeframe}</td><td className={`px-3 py-3 ${t.direction==='LONG'?'text-emerald-300':'text-rose-300'}`}>{t.direction}</td><td className="px-3 py-3">{fmt(t.entry)}</td><td className="px-3 py-3">{fmt(t.stop_loss)}</td><td className="px-3 py-3">{fmt(t.exit_price)}</td><td className="px-3 py-3">{t.grade}</td><td className="px-3 py-3">{t.score}</td><td className="px-3 py-3">{t.rr?`1:${t.rr.toFixed(2)}`:'—'}</td><td className="px-3 py-3">{t.result}</td><td className={`px-3 py-3 font-semibold ${t.pnl>0?'text-emerald-300':t.pnl<0?'text-rose-300':'text-slate-400'}`}>{money(t.pnl)}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="No journal entries yet."/>}</div></Panel>}
  </Shell>
}

export function LiveRiskPage(){
  const loader=useCallback(()=>api.dailyRisk(),[])
  const {data,loading,error,refresh}=usePolling(loader,10000)
  const d=data||{}
  return <Shell title="Risk Manager" subtitle="Backend risk state is refreshed continuously before signal permission">
    <State loading={loading} error={error}/>
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Realized P/L" value={money(d.realized_pnl||0)} tone={(d.realized_pnl||0)>0?'good':(d.realized_pnl||0)<0?'bad':'normal'}/><Metric label="Open trades" value={String(d.open_trades??0)}/><Metric label="Consecutive losses" value={String(d.consecutive_losses??0)} tone={(d.consecutive_losses||0)>=3?'bad':'normal'}/><Metric label="Status" value={String(d.status||'READY')} tone={String(d.status||'').includes('LOCK')?'bad':'good'}/></div>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Risk gate status" action={<button onClick={refresh} className="icon-btn"><RefreshCw size={14}/></button>}><Rule ok={(d.consecutive_losses||0)<3} text="Consecutive-loss protection"/><Rule ok={(d.open_trades||0)<3} text="Open-trade capacity"/><Rule ok text="Position size must be stop-distance based"/><Rule ok text="Leverage remains independently capped"/><Rule ok text="News lock can override technical quality"/></Panel><Panel title="Operating principle"><div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck size={17}/> Two-key authorization</div><p className="mt-3 text-xs leading-6 text-slate-400">A technical A+ setup is not enough. The risk gate must independently approve account exposure, loss limits, open positions and leverage before the platform treats the setup as actionable.</p></div></Panel></div>
  </Shell>
}

export function LiveAlertsPage(){
  const loader=useCallback(()=>api.notifications(false,150),[])
  const {data,loading,error,refresh}=usePolling(loader,7000)
  const items=data?.items||[]
  const unread=items.filter(n=>!n.read).length
  const [busy,setBusy]=useState(false)
  const allowBrowser=async()=>{if('Notification' in window) await Notification.requestPermission()}
  const markAll=async()=>{setBusy(true);try{await api.markAllNotificationsRead();await refresh()}finally{setBusy(false)}}
  return <Shell title="Smart Alerts" subtitle="Backend notifications synchronized with browser alert delivery">
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Stored alerts" value={String(items.length)}/><Metric label="Unread" value={String(unread)} tone={unread?'good':'normal'}/><Metric label="Poll interval" value="7s"/><Metric label="Browser permission" value={typeof Notification==='undefined'?'N/A':Notification.permission.toUpperCase()} tone={typeof Notification!=='undefined'&&Notification.permission==='granted'?'good':'normal'}/></div>
    <div className="flex flex-wrap gap-2"><button className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-semibold text-emerald-300" onClick={allowBrowser}>Enable browser alerts</button><button className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-slate-300" disabled={busy} onClick={markAll}>Mark all read</button></div>
    <State loading={loading} error={error}/>
    {!loading&&!error&&<Panel title="Notification stream"><div className="space-y-2">{items.map((n:NotificationItem)=><AlertRow key={n.id} item={n} onRead={refresh}/>) }{items.length===0&&<Empty text="No backend notifications yet."/>}</div></Panel>}
  </Shell>
}

function AlertRow({item,onRead}:{item:NotificationItem;onRead:()=>Promise<void>}){
  const read=!!item.read
  const mark=async()=>{if(!read){await api.markNotificationRead(item.id);await onRead()}}
  return <button onClick={mark} className={`w-full rounded-2xl border p-4 text-left ${read?'border-white/[0.05] bg-white/[0.015]':'border-emerald-400/15 bg-emerald-400/[0.04]'}`}><div className="flex gap-3"><div className={`grid h-9 w-9 place-items-center rounded-xl ${read?'bg-white/[0.04] text-slate-500':'bg-emerald-400/10 text-emerald-300'}`}><BellRing size={15}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold text-white">{item.title}</div><span className="text-[9px] uppercase tracking-wider text-slate-600">{new Date(item.created_at).toLocaleString()}</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{item.message}</p><div className="mt-2 flex gap-2 text-[9px] uppercase tracking-wider text-slate-600"><span>{item.severity}</span>{item.symbol&&<span>{item.symbol}</span>}{item.timeframe&&<span>{item.timeframe}</span>}</div></div></div></button>
}

function Rule({ok,text}:{ok:boolean;text:string}){return <div className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-0">{ok?<CheckCircle2 size={15} className="text-emerald-300"/>:<AlertCircle size={15} className="text-rose-300"/>}<span className="text-xs text-slate-300">{text}</span></div>}
function Empty({text}:{text:string}){return <div className="p-8 text-center text-xs text-slate-600">{text}</div>}
function fmt(v:number|null|undefined){if(v===null||v===undefined)return '—'; return v.toLocaleString(undefined,{maximumFractionDigits:8})}
function fmtRange(a:number|null,b:number|null){return a!=null&&b!=null?`${fmt(a)} – ${fmt(b)}`:'—'}
function money(v:number){return `${v>0?'+':''}$${Math.abs(v).toFixed(2)}`.replace('$-','$')}
