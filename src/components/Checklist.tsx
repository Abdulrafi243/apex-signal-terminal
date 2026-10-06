import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { ChecklistItem } from '../types/trading'

export function Checklist({ items }: { items: ChecklistItem[] }) {
  return <div className="space-y-1.5">{items.map((item) => {
    const Icon = item.status === 'pass' ? CheckCircle2 : item.status === 'warn' ? AlertTriangle : XCircle
    const cls = item.status === 'pass' ? 'text-emerald-400' : item.status === 'warn' ? 'text-amber-400' : 'text-rose-400'
    return <div key={item.label} className="flex gap-3 rounded-xl border border-white/[0.045] bg-white/[0.018] p-3"><Icon size={16} className={`mt-0.5 shrink-0 ${cls}`}/><div><div className="text-xs font-medium text-slate-200">{item.label}</div><div className="mt-1 text-[11px] text-slate-500">{item.note}</div></div></div>
  })}</div>
}
