import { useEffect, useState } from 'react'
import { AlertCircle, CalendarClock, RefreshCw, ShieldAlert, TrendingUp } from 'lucide-react'
import { api, type CalendarEvent, type BacktestResult, type WalkForwardResult, type OptimizeResult } from '../services/api'
import { Panel } from './Panel'

export function LiveNewsPage({symbol}:{symbol:string}) {
  const [ctx,setCtx]=useState<any>(null)
  const [events,setEvents]=useState<CalendarEvent[]>([])
  const [calendarState,setCalendarState]=useState('LOADING')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const load=async()=>{
    setLoading(true); setError('')
    const [c,e]=await Promise.allSettled([api.macroContext(symbol),api.calendar(6,36)])
    if(c.status==='fulfilled') setCtx(c.value); else setError(cleanError(c.reason))
    if(e.status==='fulfilled'){ setEvents(e.value.items||[]); setCalendarState(e.value.state||'UNKNOWN') }
    else { setCalendarState('UNAVAILABLE'); setError(prev=>prev||cleanError(e.reason)) }
    setLoading(false)
  }
  useEffect(()=>{load(); const id=setInterval(load,60000); return()=>clearInterval(id)},[symbol])
  const risk=ctx?.risk?.risk||'UNKNOWN'
  const locked=Boolean(ctx?.risk?.locked)
  return <Page title="News & Macro Risk" sub="High-impact macro events can override a technically strong setup">
    <div className="grid gap-4 lg:grid-cols-4"><Metric label="Symbol" value={symbol}/><Metric label="Risk" value={risk} bad={risk==='HIGH'}/><Metric label="Trade lock" value={locked?'ACTIVE':'CLEAR'} bad={locked}/><Metric label="Calendar" value={calendarState}/></div>
    {error&&<Notice text={error}/>} 
    <Panel title="Macro sensitivity" action={<button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={14}/></button>}>
      {loading&&!ctx?<Empty text="Loading macro context…"/>:<><div className="flex flex-wrap gap-2">{(ctx?.sensitivities||[]).map((x:string)=><span key={x} className="rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2 text-xs text-slate-300">{x}</span>)}</div><p className="mt-3 text-xs leading-6 text-slate-500">{ctx?.policy||'Live news provider is not configured; technical analysis remains available but the news gate stays unverified.'}</p></>}
    </Panel>
    <Panel title="Economic event queue"><EventTable items={events} state={calendarState}/></Panel>
  </Page>
}

export function LiveCalendarPage(){
  const [items,setItems]=useState<CalendarEvent[]>([])
  const [state,setState]=useState('LOADING')
  const [reason,setReason]=useState('')
  const load=async()=>{try{const r=await api.calendar(12,72);setItems(r.items||[]);setState(r.state||'UNKNOWN');setReason((r as any).reason||'')}catch(e){setState('UNAVAILABLE');setReason(cleanError(e))}}
  useEffect(()=>{load()},[])
  return <Page title="Economic Calendar" sub="Provider-backed event windows used by the news lock">
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Provider state" value={state}/><Metric label="Events" value={String(items.length)}/><Metric label="Window" value="-12h / +72h"/></div>
    {reason&&<Notice text={reason}/>} 
    <Panel title="Economic events" action={<button className="icon-btn" onClick={load}><RefreshCw size={14}/></button>}><EventTable items={items} state={state}/></Panel>
  </Page>
}

export function LiveBacktestingPage({symbol,timeframe}:{symbol:string;timeframe:string}){
  const [data,setData]=useState<BacktestResult|null>(null)
  const [wf,setWf]=useState<WalkForwardResult|null>(null)
  const [opt,setOpt]=useState<OptimizeResult|null>(null)
  const [newsReady,setNewsReady]=useState<any>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const run=async()=>{
    setBusy(true);setError('');setData(null);setWf(null);setOpt(null)
    const results=await Promise.allSettled([api.backtest(symbol,timeframe),api.walkForward(symbol,timeframe),api.optimizeBacktest(symbol,timeframe),api.newsAwareBacktestReadiness()])
    if(results[0].status==='fulfilled')setData(results[0].value); else setError(cleanError(results[0].reason))
    if(results[1].status==='fulfilled')setWf(results[1].value)
    if(results[2].status==='fulfilled')setOpt(results[2].value)
    if(results[3].status==='fulfilled')setNewsReady(results[3].value)
    setBusy(false)
  }
  return <Page title="Backtesting Lab V2" sub="Conservative replay with costs, walk-forward checks and threshold exploration">
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Symbol" value={symbol}/><Metric label="Timeframe" value={timeframe}/><Metric label="Mode" value="NO FUTURE LEAK"/><Metric label="Status" value={busy?'RUNNING':data?'READY':'IDLE'}/></div>
    <div className="flex flex-wrap gap-2"><button onClick={run} disabled={busy} className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50">{busy?'Running validation…':'Run full validation'}</button><span className="rounded-xl border border-white/[.06] px-3 py-2 text-xs text-slate-500">This can take time because it replays historical candles.</span></div>
    {error&&<Notice text={error}/>} 
    {!data&&!busy&&!error&&<Panel title="Backtest ready"><div className="p-3 text-xs leading-6 text-slate-500">Press <b className="text-slate-300">Run full validation</b>. The page will stay visible even if one optional validation module is unavailable.</div></Panel>}
    {data&&<><div className="grid gap-4 md:grid-cols-4"><Metric label="Trades" value={String(data.trades??0)}/><Metric label="Win rate" value={`${num(data.win_rate)}%`}/><Metric label="Profit factor" value={num(data.profit_factor)}/><Metric label="Max DD" value={`${num(data.max_drawdown_r)}R`}/></div>
    <Panel title="Net performance after modeled costs"><div className="grid gap-3 md:grid-cols-4"><Metric label="Gross" value={`${num(data.gross_r)}R`}/><Metric label="Costs" value={`${num(data.costs_r)}R`}/><Metric label="Net" value={`${num(data.net_r)}R`}/><Metric label="Expectancy" value={`${num(data.expectancy_r)}R`}/></div><div className="mt-4 grid gap-3 md:grid-cols-4"><Metric label="Long WR" value={`${num(data.long_win_rate)}%`}/><Metric label="Short WR" value={`${num(data.short_win_rate)}%`}/><Metric label="Avg hold" value={`${num(data.avg_holding_bars)} bars`}/><Metric label="Leakage guard" value={data.no_future_leakage?'PASS':'FAIL'}/></div><p className="mt-4 text-xs leading-6 text-slate-500">Modeled costs: {num(data.cost_model?.fee_bps)} bps fee, {num(data.cost_model?.slippage_bps)} bps slippage, {num(data.cost_model?.funding_bps_8h)} bps funding / 8h. Same-bar policy: {data.same_bar_policy||'—'}.</p></Panel></>}
    {wf&&<Panel title="Walk-forward consistency"><div className="grid gap-3 md:grid-cols-3"><Metric label="Folds tested" value={String(wf.folds_tested??0)}/><Metric label="Positive folds" value={String(wf.positive_folds??0)}/><Metric label="Consistency" value={`${num(wf.consistency_pct)}%`}/></div><div className="mt-4 space-y-2">{(wf.items||[]).map((x:any)=><div key={x.fold} className="grid grid-cols-2 gap-2 rounded-xl border border-white/[.05] px-3 py-2 text-xs text-slate-400 md:grid-cols-5"><span>Fold {x.fold}</span><span>{x.trades} trades</span><span>{x.win_rate}% WR</span><span>{x.net_r}R</span><span>DD {x.max_drawdown_r}R</span></div>)}</div></Panel>}
    {opt&&<Panel title="Signal score threshold study"><div className="grid gap-2 md:grid-cols-3">{(opt.candidates||[]).map((x:any)=><div key={x.min_score} className={`rounded-xl border p-3 text-xs ${opt.best?.min_score===x.min_score?'border-emerald-400/30 bg-emerald-400/[.06]':'border-white/[.05]'}`}><div className="font-semibold text-slate-200">Score ≥ {x.min_score}</div><div className="mt-2 text-slate-500">{x.trades} trades • {x.win_rate}% WR • {x.net_r}R • PF {x.profit_factor}</div></div>)}</div><p className="mt-4 text-xs leading-6 text-amber-300/80">{opt.warning||'Threshold selection must be confirmed out-of-sample.'}</p></Panel>}
    <Panel title="Historical-news status"><p className={`text-xs leading-6 ${newsReady?.ready?'text-emerald-300':'text-amber-300/80'}`}>{newsReady?.ready?'READY — point-in-time historical-news provider is configured.':'OPTIONAL PROVIDER NOT CONFIGURED — technical backtests still work. News-aware historical evidence remains disabled to prevent look-ahead bias.'}</p></Panel>
  </Page>
}

function Page({title,sub,children}:{title:string;sub:string;children:React.ReactNode}){return <div className="mx-auto max-w-[1780px] space-y-4 p-4 lg:p-6"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.22em] text-emerald-400"><TrendingUp size={12}/> Analysis workspace</div><h1 className="text-2xl font-bold text-white lg:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{sub}</p></div>{children}</div>}
function Metric({label,value,bad=false}:{label:string;value:string;bad?:boolean}){return <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">{label}</div><div className={`mt-2 text-lg font-bold ${bad?'text-rose-300':'text-white'}`}>{value}</div></div>}
function Notice({text}:{text:string}){return <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3 text-xs leading-5 text-amber-200"><AlertCircle size={14} className="mt-0.5 shrink-0"/>{text}</div>}
function Empty({text}:{text:string}){return <div className="p-8 text-center text-xs text-slate-600">{text}</div>}
function EventTable({items,state}:{items:CalendarEvent[];state:string}){if(!items.length)return <Empty text={state==='PROVIDER_NOT_CONFIGURED'?'No live news provider is configured. The page remains available and the trading engine treats news as UNVERIFIED.':state==='UNAVAILABLE'?'Economic calendar is temporarily unavailable. Technical analysis remains available.':'No events in the selected window.'}/>; return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-xs"><thead className="text-left text-[10px] uppercase tracking-wider text-slate-600"><tr>{['Time','Impact','Currency','Event','Actual','Forecast','Previous'].map(x=><th key={x} className="border-b border-white/[.06] px-3 py-3">{x}</th>)}</tr></thead><tbody>{items.map((e,i)=><tr key={`${e.datetime}-${e.title}-${i}`} className="border-b border-white/[.04]"><td className="px-3 py-3 text-slate-500">{safeDate(e.datetime)}</td><td className={`px-3 py-3 font-semibold ${e.impact==='HIGH'?'text-rose-300':e.impact==='MEDIUM'?'text-amber-300':'text-slate-400'}`}>{e.impact}</td><td className="px-3 py-3">{e.currency||'—'}</td><td className="px-3 py-3 text-white">{e.title}</td><td className="px-3 py-3">{display(e.actual)}</td><td className="px-3 py-3">{display(e.forecast)}</td><td className="px-3 py-3">{display(e.previous)}</td></tr>)}</tbody></table></div>}
function display(v:any){return v===null||v===undefined||v===''?'—':String(v)}
function safeDate(v:string){try{return new Date(v).toLocaleString()}catch{return v||'—'}}
function num(v:any){const n=Number(v);return Number.isFinite(n)?String(Math.round(n*100)/100):'—'}
function cleanError(e:any){const m=e instanceof Error?e.message:String(e||'Request failed'); return m.includes('Backend is unreachable')?m:'Data source unavailable. The page will remain usable and can be refreshed.'}
