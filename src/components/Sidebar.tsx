import { Activity, BellRing, BookOpenCheck, CalendarClock, ChartNoAxesCombined, Gauge, LayoutDashboard, Newspaper, Radar, Settings2, ShieldCheck } from 'lucide-react'
import type { PageKey } from '../types/trading'

const items: [typeof LayoutDashboard, PageKey][] = [
  [LayoutDashboard, 'Dashboard'],
  [Radar, 'Market Scanner'],
  [ChartNoAxesCombined, 'Signals'],
  [Activity, 'Smart Money'],
  [Newspaper, 'News'],
  [CalendarClock, 'Economic Calendar'],
  [ShieldCheck, 'Risk Manager'],
  [Gauge, 'Backtesting'],
  [BookOpenCheck, 'Trade Journal'],
  [BellRing, 'Alerts'],
  [Settings2, 'Settings'],
]

export function Sidebar({ page, onPageChange }: { page: PageKey; onPageChange: (page: PageKey) => void }) {
  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-white/[0.06] bg-[#070a0f] xl:flex xl:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 text-lg font-black text-black shadow-[0_0_30px_rgba(52,211,153,.18)]">A</div>
        <div>
          <div className="font-semibold tracking-tight text-white">APEX SIGNAL</div>
          <div className="text-[10px] tracking-[0.24em] text-slate-500">INSTITUTIONAL TERMINAL</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(([Icon, label]) => (
          <button key={label} onClick={() => onPageChange(label)} className={`nav-item ${page === label ? 'nav-item-active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /> Engine status
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">Frontend phase 3. Advanced chart workspace is active; live execution remains disabled until backend validation.</p>
      </div>
    </aside>
  )
}
