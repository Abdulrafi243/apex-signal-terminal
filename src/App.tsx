import { useEffect, useState } from 'react'
import { BellRing, CircleDot, ShieldCheck, Activity, LockKeyhole } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Panel } from './components/Panel'
import { ChartWorkspace } from './components/ChartWorkspace'
import { NotificationCenter } from './components/NotificationCenter'
import { MobileNav } from './components/MobileNav'
import { LiveChecklist } from './components/LiveChecklist'
import { LiveMultiTimeframe } from './components/LiveMultiTimeframe'
import { LiveUpcomingRisk } from './components/LiveUpcomingRisk'
import { NotificationCard } from './components/NotificationCard'
import { LiveDashboardStats } from './components/LiveDashboardStats'
import { SettingsPage, SmartMoneyPage } from './components/Phase2Pages'
import { LiveBacktestingPage, LiveCalendarPage, LiveNewsPage } from './components/Phase12Pages'
import { LiveAlertsPage, LiveJournalPage, LiveRiskPage, LiveSignalsPage, LiveMarketScannerPage } from './components/LivePages'
import { LiveCurrentSignal } from './components/LiveCurrentSignal'
import { ProductionHealth } from './components/ProductionHealth'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { MarketMode, PageKey, Timeframe } from './types/trading'

export default function App() {
  const [market, setMarket] = useState<MarketMode>('FUTURES')
  const [timeframe, setTimeframe] = useState<Timeframe>('15M')
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [page, setPage] = useState<PageKey>('Dashboard')
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    setSymbol(market === 'FOREX' ? 'XAUUSD' : 'BTCUSDT')
  }, [market])

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200">
      <div className="flex min-h-screen">
        <Sidebar page={page} onPageChange={setPage} />
        <main className="min-w-0 flex-1">
          <Header market={market} setMarket={setMarket} timeframe={timeframe} setTimeframe={setTimeframe} symbol={symbol} setSymbol={setSymbol} onNotifications={() => setNotificationsOpen(true)} />
          <ErrorBoundary>{page === 'Dashboard' ? <Dashboard symbol={symbol} timeframe={timeframe}/> : <PageRouter page={page} market={market} timeframe={timeframe} symbol={symbol}/>}</ErrorBoundary> 
        </main>
      </div>
      <MobileNav page={page} onPageChange={setPage} />
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  )
}

function PageRouter({page,market,timeframe,symbol}:{page:PageKey;market:MarketMode;timeframe:Timeframe;symbol:string}) {
  if (page === 'Market Scanner') return <LiveMarketScannerPage market={market} timeframe={timeframe}/>
  if (page === 'Signals') return <LiveSignalsPage/>
  if (page === 'Smart Money') return <SmartMoneyPage/>
  if (page === 'News') return <LiveNewsPage symbol={symbol}/>
  if (page === 'Economic Calendar') return <LiveCalendarPage/>
  if (page === 'Risk Manager') return <LiveRiskPage/>
  if (page === 'Backtesting') return <LiveBacktestingPage symbol={symbol} timeframe={timeframe}/>
  if (page === 'Trade Journal') return <LiveJournalPage/>
  if (page === 'Alerts') return <LiveAlertsPage/>
  if (page === 'Settings') return <SettingsPage/>
  return null
}

function Dashboard({symbol,timeframe}:{symbol:string;timeframe:Timeframe}) {
  return <div className="mx-auto max-w-[1780px] space-y-4 p-4 lg:p-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-400"><CircleDot size={12}/> Live decision workspace</div><h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">Institutional Signal Dashboard</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Confluence-first analysis. The system can refuse a trade when structure, liquidity, risk or news conditions conflict.</p></div>
      <div className="flex flex-wrap gap-2"><Badge icon={Activity} label="Engine" value="LIVE ANALYSIS" tone="emerald"/><Badge icon={ShieldCheck} label="Risk guard" value="ENFORCED" tone="emerald"/><Badge icon={LockKeyhole} label="Auto-trade" value="OFF" tone="sky"/></div>
    </div>
    <LiveDashboardStats />
    <ProductionHealth symbol={symbol} timeframe={timeframe}/>
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4"><ChartWorkspace symbol={symbol} timeframe={timeframe} /><div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]"><Panel title="Multi-timeframe bias" subtitle="Higher-timeframe context drives lower-timeframe entries"><LiveMultiTimeframe symbol={symbol} timeframe={timeframe}/></Panel><Panel title="Trade checklist" subtitle="No signal is valid until critical filters pass"><LiveChecklist symbol={symbol} timeframe={timeframe}/></Panel></div></div>
      <div className="space-y-4"><Panel title="Current high-quality setup" action={<span className="flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300"><BellRing size={11}/> ALERT READY</span>}><LiveCurrentSignal symbol={symbol} timeframe={timeframe}/></Panel><Panel title="Smart notifications" subtitle="Browser alert prototype"><NotificationCard/></Panel><Panel title="Risk guard" subtitle="Capital protection before opportunity"><div className="grid grid-cols-2 gap-2 text-xs"><RiskBox label="Risk / trade" value="1.00%"/><RiskBox label="Daily limit" value="3.00%"/><RiskBox label="Open risk" value="1.00%"/><RiskBox label="Status" value="SAFE" good/></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full w-[33%] rounded-full bg-emerald-400"/></div><p className="mt-2 text-[10px] leading-4 text-slate-500">Daily lock engages automatically after configured drawdown or consecutive-loss rules.</p></Panel></div>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><Panel title="Market scanner" subtitle="Use the Market Scanner page for live backend-ranked opportunities"><div className="p-4 text-xs leading-6 text-slate-500">The scanner now runs against the backend analysis engine and refreshes independently. It is intentionally separated from this chart to avoid excessive API load.</div></Panel><Panel title="Upcoming market risk" subtitle="Economic + crypto event queue"><LiveUpcomingRisk/></Panel></div>
  </div>
}

function Badge({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: 'emerald'|'sky' }) { const cls = tone === 'emerald' ? 'border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300' : 'border-sky-400/15 bg-sky-400/[0.05] text-sky-300'; return <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${cls}`}><Icon size={14}/><div><span className="text-[9px] uppercase tracking-wider opacity-60">{label}</span><div className="text-xs font-semibold">{value}</div></div></div> }
function RiskBox({ label, value, good = false }: {label:string; value:string; good?:boolean}) { return <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"><div className="text-[9px] uppercase tracking-wider text-slate-600">{label}</div><div className={`mt-1.5 font-semibold ${good ? 'text-emerald-300':'text-white'}`}>{value}</div></div> }
