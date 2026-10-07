import { useCallback } from 'react'
import { api } from '../services/api'
import { usePolling } from '../lib/usePolling'

export function LiveDashboardStats(){
  const summary=usePolling(useCallback(()=>api.dashboardSummary(),[]),15000)
  const daily=usePolling(useCallback(()=>api.dailyRisk(),[]),15000)
  const s=summary.data||{}; const d=daily.data||{}
  const items=[
    ['Today P/L',money(d.realized_pnl),`${d.wins??0}W / ${d.losses??0}L`],
    ['Win rate',pct(s.win_rate),`${s.closed_trades??0} closed`],
    ['Signals',num(s.signals),`${s.a_plus_signals??0} A+`],
    ['Open trades',num(d.open_trades),`Streak L: ${d.consecutive_losses??0}`],
    ['Unread alerts',num(s.unread_notifications),'Database-backed'],
  ]
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{items.map(([label,value,note])=><div key={label} className="rounded-2xl border border-white/[0.055] bg-white/[0.022] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div><div className={`mt-2 text-lg font-bold ${String(value).startsWith('+')?'text-emerald-300':String(value).startsWith('-')?'text-rose-300':'text-white'}`}>{summary.loading||daily.loading?'…':value}</div><div className="mt-1 text-[10px] text-slate-500">{summary.error||daily.error?'Backend unavailable':note}</div></div>)}</div>
}
function money(v:unknown){const n=Number(v); return Number.isFinite(n)?`${n>=0?'+':''}$${n.toFixed(2)}`:'—'}
function pct(v:unknown){const n=Number(v); return Number.isFinite(n)?`${n.toFixed(1)}%`:'—'}
function num(v:unknown){const n=Number(v); return Number.isFinite(n)?String(n):'—'}
