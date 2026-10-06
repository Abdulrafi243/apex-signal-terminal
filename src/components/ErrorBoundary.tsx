import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type State = { error: Error | null }

export class ErrorBoundary extends React.Component<{children:React.ReactNode}, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('Page render error', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return <div className="mx-auto max-w-[1780px] p-4 lg:p-6"><div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-6"><div className="flex items-center gap-2 text-sm font-semibold text-amber-300"><AlertTriangle size={18}/> This page hit a display error</div><p className="mt-3 text-xs leading-6 text-slate-400">The rest of the terminal is still running. Reload this page after checking the backend connection.</p><button className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-slate-200" onClick={()=>{this.setState({error:null}); window.location.reload()}}><RefreshCw size={14}/> Reload</button></div></div>
  }
}
