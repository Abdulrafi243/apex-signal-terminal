import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Crosshair, Gauge, Layers3, LineChart, Newspaper, Radar, ShieldAlert, ShieldCheck, SlidersHorizontal, Target, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { Panel } from './Panel'
import { ScannerFilters } from './ScannerFilters'

const scannerRows = [
  ['BTCUSDT','15M','LONG','91','A+','SSL Sweep + FVG','1:3.4','SAFE'],
  ['XAUUSD','15M','LONG','88','A','CHoCH + OB','1:2.8','SAFE'],
  ['SOLUSDT','5M','SHORT','84','A','BSL Sweep + MSS','1:2.5','SAFE'],
  ['PEPEUSDT','15M','LONG','82','A','Demand + FVG','1:2.2','SAFE'],
  ['ETHUSDT','1H','WAIT','69','B','HTF conflict','—','WAIT'],
  ['BNBUSDT','30M','WAIT','64','B','Range / no displacement','—','WAIT'],
]

const history = [
  ['BTCUSDT','15M','LONG','A+','91','1:3.4','TP2','+2.0R'],
  ['XAUUSD','5M','SHORT','A','86','1:2.6','TP1','+1.0R'],
  ['SOLUSDT','15M','LONG','A','83','1:2.4','SL','-1.0R'],
  ['PEPEUSDT','5M','LONG','A+','90','1:3.1','TP3','+3.1R'],
  ['BTCUSDT','1H','SHORT','B','76','1:2.0','BE','0.0R'],
]

export function MarketScannerPage() {
  return <PageShell title="Market Scanner" subtitle="Cross-market confluence ranking with strict no-trade filtering">
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Scanned" value="48"/><Metric label="A+ setups" value="2" good/><Metric label="A setups" value="5"/><Metric label="Rejected" value="31"/></div>
    <ScannerFilters/>
    <Panel title="Live opportunity ranking" subtitle="Phase 2 mock scanner — backend data comes next"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-600"><tr>{['Asset','TF','Bias','Score','Grade','Setup','RR','Status'].map(x=><th key={x} className="border-b border-white/[0.06] px-3 py-3">{x}</th>)}</tr></thead><tbody>{scannerRows.map(r=><tr key={r[0]+r[1]} className="border-b border-white/[0.04] text-slate-300 hover:bg-white/[0.02]">{r.map((v,i)=><td key={i} className={`px-3 py-3 ${i===2 && v==='LONG'?'text-emerald-300':i===2&&v==='SHORT'?'text-rose-300':i===3?'font-bold text-white':''}`}>{v}</td>)}</tr>)}</tbody></table></div></Panel>
    <div className="grid gap-4 lg:grid-cols-3"><Info icon={Radar} title="Confluence filter" text="Only setups passing structure, liquidity, displacement, risk and news filters can reach the top."/><Info icon={Layers3} title="Multi-timeframe" text="Daily/4H context can block a lower-timeframe signal when the trade is badly positioned."/><Info icon={ShieldCheck} title="No-trade state" text="WAIT and REJECT are first-class outcomes. The engine is not forced to generate a trade."/></div>
  </PageShell>
}

export function SignalsPage() {
  return <PageShell title="Signals & History" subtitle="Every alert keeps its setup logic, risk profile and eventual outcome">
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Today" value="7"/><Metric label="Wins" value="5" good/><Metric label="Losses" value="2" bad/><Metric label="Net R" value="+6.1R" good/></div>
    <Panel title="Signal history" subtitle="Audit trail for performance validation"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-xs"><thead className="text-left text-[10px] uppercase tracking-wider text-slate-600"><tr>{['Symbol','TF','Side','Grade','Score','RR','Outcome','Result'].map(x=><th key={x} className="border-b border-white/[0.06] px-3 py-3">{x}</th>)}</tr></thead><tbody>{history.map(r=><tr key={r.join('-')} className="border-b border-white/[0.04]"><td className="px-3 py-3 font-semibold text-white">{r[0]}</td>{r.slice(1).map((v,i)=><td key={i} className={`px-3 py-3 ${v.includes('+')?'text-emerald-300':v.includes('-1')?'text-rose-300':'text-slate-400'}`}>{v}</td>)}</tr>)}</tbody></table></div></Panel>
  </PageShell>
}

export function SmartMoneyPage() {
  const concepts = [['Market Structure','Bullish 4H / 1H','BOS confirmed'],['Liquidity','SSL taken','No BSL sweep yet'],['Fair Value Gap','5M bullish FVG','Partially mitigated'],['Order Block','1H demand OB','Valid'],['Premium / Discount','Discount','Longs favored'],['Displacement','Strong','Volume confirmed']]
  return <PageShell title="Smart Money Workspace" subtitle="Structure, liquidity and imbalance map for the active market"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{concepts.map(([a,b,c])=><Panel key={a} title={a}><div className="text-xl font-bold text-white">{b}</div><div className="mt-2 text-xs text-emerald-300">{c}</div></Panel>)}</div><Panel title="Institutional narrative"><div className="grid gap-3 md:grid-cols-4"><Flow n="1" title="Liquidity" text="Sell-side pool swept"/><Flow n="2" title="Shift" text="Bullish CHoCH"/><Flow n="3" title="Repricing" text="Displacement leaves FVG"/><Flow n="4" title="Entry" text="Retest in discount"/></div></Panel></PageShell>
}

export function NewsPage() {
  return <PageShell title="News & Market Risk" subtitle="High-impact events can downgrade or block technically valid setups"><div className="grid gap-4 lg:grid-cols-3"><Info icon={Newspaper} title="Macro filter" text="CPI, NFP, FOMC, PCE, GDP and major central-bank events receive protected risk windows."/><Info icon={AlertTriangle} title="Event lock" text="A+ technical setup can still become NO TRADE when event risk is too close."/><Info icon={Clock3} title="Post-news cooldown" text="The engine waits for volatility normalization before restoring normal entries."/></div><Panel title="Event queue"><Event time="18:00" impact="HIGH" title="USD • ISM Services PMI" status="Trade lock: 15m before / after"/><Event time="19:30" impact="MEDIUM" title="USD • Fed speaker" status="Risk downgrade"/><Event time="22:00" impact="MEDIUM" title="Crypto • ETF flow update" status="BTC sensitivity"/></Panel></PageShell>
}

export function CalendarPage() {
  return <PageShell title="Economic Calendar" subtitle="Planning view for event-driven risk"><Panel title="Today's protected windows"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><CalendarCard day="Today" time="18:00" label="ISM Services" impact="HIGH"/><CalendarCard day="Today" time="19:30" label="Fed Speaker" impact="MEDIUM"/><CalendarCard day="Tomorrow" time="17:00" label="US Jobless Claims" impact="HIGH"/><CalendarCard day="Tomorrow" time="18:30" label="Oil Inventories" impact="LOW"/></div></Panel></PageShell>
}

export function RiskPage() {
  return <PageShell title="Risk Manager" subtitle="Capital protection rules are checked before every signal"><div className="grid gap-4 md:grid-cols-4"><Metric label="Account" value="$10,000"/><Metric label="Risk / trade" value="1.0%"/><Metric label="Daily loss cap" value="3.0%"/><Metric label="Open risk" value="1.0%" good/></div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Hard protection rules"><Rule ok title="Max 1% risk per trade"/><Rule ok title="Max 3% daily drawdown"/><Rule ok title="Max 2 correlated positions"/><Rule ok title="Minimum 1:2 planned R:R"/><Rule ok title="News lock enabled"/><Rule ok title="3-loss daily lock enabled"/></Panel><Panel title="Position size calculator"><div className="grid grid-cols-2 gap-3"><Field label="Balance" value="$10,000"/><Field label="Risk" value="1.00%"/><Field label="Entry" value="68,300"/><Field label="Stop" value="67,900"/></div><div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Maximum planned loss</div><div className="mt-1 text-2xl font-bold text-emerald-300">$100.00</div></div></Panel></div></PageShell>
}

export function BacktestingPage() {
  return <PageShell title="Backtesting Lab" subtitle="Strategy quality will be measured before live trust"><div className="grid gap-4 md:grid-cols-4"><Metric label="Sample trades" value="1,284"/><Metric label="Win rate" value="63.8%" good/><Metric label="Profit factor" value="1.82" good/><Metric label="Max drawdown" value="8.4%"/></div><Panel title="Validation pipeline"><div className="grid gap-3 md:grid-cols-4"><Flow n="1" title="Historical data" text="Clean candles + events"/><Flow n="2" title="Rule replay" text="No future leakage"/><Flow n="3" title="Metrics" text="WR, PF, DD, expectancy"/><Flow n="4" title="Forward test" text="Paper trading gate"/></div></Panel></PageShell>
}

export function JournalPage() {
  return <PageShell title="Trade Journal" subtitle="Every decision remains explainable"><div className="grid gap-4 lg:grid-cols-3"><Panel title="Latest trade"><div className="text-lg font-bold text-white">BTCUSDT • 15M • LONG</div><p className="mt-3 text-xs leading-6 text-slate-400">SSL sweep followed by bullish CHoCH and displacement. Entry was taken on FVG mitigation inside the 1H discount zone.</p></Panel><Panel title="What worked"><Tag text="HTF alignment"/><Tag text="Liquidity sweep"/><Tag text="News safe"/></Panel><Panel title="Review"><Tag text="TP2 reached" good/><Tag text="+2.0R" good/><Tag text="No rule violation" good/></Panel></div></PageShell>
}

export function AlertsPage() {
  return <PageShell title="Smart Alerts" subtitle="You control exactly which setups are important enough to interrupt you"><div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><Panel title="Alert policy"><Toggle title="A+ setups" desc="Always notify when all hard filters pass" on/><Toggle title="A-grade setups" desc="Notify when score is 85 or higher" on/><Toggle title="News-safe only" desc="Suppress alerts inside protected news windows" on/><Toggle title="Minimum 1:2 R:R" desc="No alert for poor asymmetry" on/><Toggle title="Browser notifications" desc="Desktop/browser push prototype" on/><Toggle title="Sound alert" desc="Audible alert for A+ only"/></Panel><Panel title="Alert preview"><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4"><div className="flex items-center gap-2 text-emerald-300"><BellRing size={17}/><span className="text-xs font-bold">A+ SIGNAL • BTCUSDT • 15M</span></div><div className="mt-4 text-2xl font-bold text-white">LONG • 91/100</div><p className="mt-2 text-xs leading-5 text-slate-400">SSL Sweep → CHoCH → Displacement → FVG Retest</p><div className="mt-4 grid grid-cols-3 gap-2"><Mini label="Entry" value="68,240"/><Mini label="SL" value="67,870"/><Mini label="RR" value="1:3.4"/></div></div></Panel></div></PageShell>
}

export function SettingsPage() {
  return <PageShell title="Settings" subtitle="Terminal preferences and signal policy"><div className="grid gap-4 lg:grid-cols-2"><Panel title="Trading preferences"><Field label="Default market" value="Binance Futures"/><Field label="Default timeframe" value="15M"/><Field label="Minimum signal score" value="85 / 100"/><Field label="Minimum R:R" value="1 : 2"/></Panel><Panel title="Engine policy"><Rule ok title="Require HTF confirmation"/><Rule ok title="Require liquidity event"/><Rule ok title="Require structure shift"/><Rule ok title="Use news protection"/><Rule ok title="Allow NO TRADE outcome"/></Panel></div></PageShell>
}

function PageShell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <div className="mx-auto max-w-[1780px] space-y-4 p-4 lg:p-6"><div><div className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-400">APEX WORKSPACE</div><h1 className="text-2xl font-bold text-white lg:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{subtitle}</p></div>{children}</div>}
function Metric({label,value,good,bad}:{label:string;value:string;good?:boolean;bad?:boolean}){return <div className="panel"><div className="text-[10px] uppercase tracking-widest text-slate-600">{label}</div><div className={`mt-2 text-2xl font-bold ${good?'text-emerald-300':bad?'text-rose-300':'text-white'}`}>{value}</div></div>}
function Info({icon:Icon,title,text}:{icon:typeof Radar;title:string;text:string}){return <Panel title={title}><Icon size={19} className="mb-3 text-emerald-300"/><p className="text-xs leading-6 text-slate-400">{text}</p></Panel>}
function Flow({n,title,text}:{n:string;title:string;text:string}){return <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/10 text-xs font-bold text-emerald-300">{n}</div><div className="mt-3 text-sm font-semibold text-white">{title}</div><div className="mt-1 text-xs text-slate-500">{text}</div></div>}
function Event({time,impact,title,status}:{time:string;impact:string;title:string;status:string}){return <div className="flex flex-col gap-3 border-b border-white/[0.05] py-4 last:border-0 md:flex-row md:items-center"><div className="text-sm font-bold text-white">{time}</div><span className={`w-fit rounded-md px-2 py-1 text-[9px] font-bold ${impact==='HIGH'?'bg-rose-400/10 text-rose-300':'bg-amber-400/10 text-amber-300'}`}>{impact}</span><div className="flex-1 text-xs text-slate-300">{title}</div><div className="text-[10px] text-slate-600">{status}</div></div>}
function CalendarCard({day,time,label,impact}:{day:string;time:string;label:string;impact:string}){return <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"><div className="flex justify-between text-[10px] text-slate-600"><span>{day}</span><span>{impact}</span></div><div className="mt-3 text-xl font-bold text-white">{time}</div><div className="mt-1 text-xs text-slate-400">{label}</div></div>}
function Rule({ok,title}:{ok:boolean;title:string}){return <div className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-0">{ok?<CheckCircle2 size={16} className="text-emerald-300"/>:<XCircle size={16} className="text-rose-300"/>}<span className="text-xs text-slate-300">{title}</span></div>}
function Field({label,value}:{label:string;value:string}){return <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[9px] uppercase tracking-wider text-slate-600">{label}</div><div className="mt-1 text-sm font-semibold text-white">{value}</div></div>}
function Tag({text,good}:{text:string;good?:boolean}){return <div className={`mb-2 rounded-lg border px-3 py-2 text-xs ${good?'border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300':'border-white/[0.06] bg-white/[0.02] text-slate-400'}`}>{text}</div>}
function Toggle({title,desc,on=false}:{title:string;desc:string;on?:boolean}){return <div className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-0"><div className="flex-1"><div className="text-xs font-semibold text-white">{title}</div><div className="mt-1 text-[10px] text-slate-500">{desc}</div></div><div className={`h-6 w-11 rounded-full p-1 ${on?'bg-emerald-400':'bg-white/[0.08]'}`}><div className={`h-4 w-4 rounded-full bg-white transition ${on?'ml-5':'ml-0'}`}/></div></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-black/20 p-2"><div className="text-[9px] text-slate-600">{label}</div><div className="mt-1 text-xs font-semibold text-white">{value}</div></div>}
