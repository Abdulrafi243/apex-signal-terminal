const stats = [
  ['Today P/L', '+2.84%', '+$142.20'],
  ['Win rate', '71.4%', '5W / 2L'],
  ['Profit factor', '2.31', 'Today'],
  ['Average R:R', '1 : 2.7', 'Executed'],
  ['Drawdown', '1.18%', 'Daily'],
]

export function Stats() {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{stats.map(([label,value,note]) => <div key={label} className="rounded-2xl border border-white/[0.055] bg-white/[0.022] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div><div className={`mt-2 text-lg font-bold ${value.startsWith('+') ? 'text-emerald-300' : 'text-white'}`}>{value}</div><div className="mt-1 text-[10px] text-slate-500">{note}</div></div>)}</div>
}
