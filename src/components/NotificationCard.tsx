import { BellRing, Check, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { requestBrowserNotifications } from '../lib/notifications'

export function NotificationCard() {
  const [status, setStatus] = useState('Not enabled')
  const [enabled, setEnabled] = useState(false)

  async function enable() {
    const res = await requestBrowserNotifications()
    setEnabled(res.ok)
    setStatus(res.message)
  }

  return <div>
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="flex gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><BellRing size={17}/></div><div><div className="text-xs font-semibold text-white">Strong signal alerts</div><div className="mt-1 text-[10px] text-slate-500">A+ / score ≥ 85 / news safe</div></div></div>
      <button onClick={enable} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${enabled ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white text-black'}`}>{enabled ? <span className="flex items-center gap-1"><Check size={12}/>ENABLED</span> : 'ENABLE'}</button>
    </div>
    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600"><Volume2 size={12}/> {status}</div>
  </div>
}
