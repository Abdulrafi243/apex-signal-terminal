import { Filter, SlidersHorizontal } from 'lucide-react'

export function ScannerFilters() {
  return <div className="panel flex flex-wrap items-center gap-2">
    <div className="mr-2 flex items-center gap-2 text-xs font-semibold text-white"><SlidersHorizontal size={15} className="text-emerald-300"/>Filters</div>
    {['All TF','A+ & A','Score ≥ 70','RR ≥ 1:2','News Safe','HTF Aligned'].map((x,i)=><button key={x} className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${i===0?'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300':'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-white'}`}>{x}</button>)}
    <button className="ml-auto flex items-center gap-2 rounded-lg border border-white/[0.06] px-3 py-2 text-[10px] text-slate-400"><Filter size={13}/>Advanced</button>
  </div>
}
