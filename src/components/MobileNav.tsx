import { BellRing, LayoutDashboard, Menu, Radar, ShieldCheck } from 'lucide-react'
import type { PageKey } from '../types/trading'

export function MobileNav({page,onPageChange}:{page:PageKey;onPageChange:(p:PageKey)=>void}) {
  const items: [typeof LayoutDashboard, PageKey][] = [[LayoutDashboard,'Dashboard'],[Radar,'Market Scanner'],[BellRing,'Alerts'],[ShieldCheck,'Risk Manager']]
  return <div className="fixed bottom-3 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border border-white/[0.08] bg-[#0b0f15]/95 p-2 shadow-2xl backdrop-blur-xl xl:hidden">{items.map(([Icon,label])=><button key={label} onClick={()=>onPageChange(label)} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] ${page===label?'bg-emerald-400/10 text-emerald-300':'text-slate-500'}`}><Icon size={16}/><span>{label==='Market Scanner'?'Scanner':label==='Risk Manager'?'Risk':label}</span></button>)}<button onClick={()=>onPageChange('Settings')} className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] text-slate-500"><Menu size={16}/><span>More</span></button></div>
}
