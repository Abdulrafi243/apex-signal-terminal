import { ArrowUpRight, BadgeCheck, Clock3, Crosshair, ShieldAlert, Target } from 'lucide-react'
import type { Signal } from '../types/trading'

export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.10] via-transparent to-transparent p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-400 px-2 py-1 text-[10px] font-black tracking-widest text-black">{signal.quality} SETUP</span>
            <span className="text-xs text-slate-500">{signal.symbol}</span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-black tracking-tight text-white">{signal.direction}</span>
            <ArrowUpRight className="mb-1 text-emerald-400" />
          </div>
        </div>
        <div className="relative grid h-20 w-20 place-items-center rounded-full border border-emerald-400/20 bg-black/20">
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-300">{signal.score}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500">score</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
        <Metric icon={Crosshair} label="Entry zone" value={signal.entry} />
        <Metric icon={ShieldAlert} label="Stop loss" value={signal.stopLoss} />
        <Metric icon={Target} label="Risk / Reward" value={signal.rr} />
        <Metric icon={Clock3} label="Session" value={signal.session} />
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white"><BadgeCheck size={15} className="text-emerald-400" /> Confluence</div>
        <p className="text-xs leading-5 text-slate-400">{signal.setup}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {signal.takeProfits.map((tp, i) => <div key={tp} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2 text-center"><div className="text-[9px] tracking-widest text-slate-500">TP{i+1}</div><div className="mt-1 text-xs font-semibold text-white">{tp}</div></div>)}
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="flex items-center gap-2 text-slate-500"><Icon size={14} /><span>{label}</span></div><div className="mt-1.5 font-semibold text-slate-200">{value}</div></div>
}
