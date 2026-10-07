import { useCallback, useEffect, useMemo, useState } from 'react'
import { BoxSelect, Crosshair, Eye, EyeOff, Layers3, Maximize2, MousePointer2, Ruler, SlidersHorizontal } from 'lucide-react'
import { api, type Candle, type OverlayBundle } from '../services/api'
import { useMarketStream } from '../lib/useMarketStream'

type OverlayKey='FVG'|'Order Blocks'|'Liquidity'|'Structure'|'EMA'
const overlayMeta:{key:OverlayKey;short:string}[]=[{key:'FVG',short:'FVG'},{key:'Order Blocks',short:'OB'},{key:'Liquidity',short:'LQ'},{key:'Structure',short:'MS'},{key:'EMA',short:'EMA'}]

export function ChartWorkspace({symbol,timeframe}:{symbol:string;timeframe:string}){
  const [candles,setCandles]=useState<Candle[]>([]), [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null)
  const [analysis,setAnalysis]=useState<OverlayBundle|null>(null), [analysisError,setAnalysisError]=useState<string|null>(null)
  const [overlays,setOverlays]=useState<Record<OverlayKey,boolean>>({FVG:true,'Order Blocks':true,Liquidity:true,Structure:true,EMA:true})
  const [tool,setTool]=useState('Cursor')
  const isForex=!symbol.endsWith('USDT')

  useEffect(()=>{let alive=true;setLoading(true);setError(null);setAnalysis(null);setAnalysisError(null)
    const preflight=isForex?api.forexStatus().then(r=>{if(!r.configured) throw new Error(r.message||'Forex provider is not configured')}):Promise.resolve(null)
    // Market candles and overlays are independent. A temporary overlay 502 must not blank the live chart.
    preflight.then(()=>api.candles(symbol,timeframe,240)).then(r=>{if(alive)setCandles(r.items)}).catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e))}).finally(()=>alive&&setLoading(false))
    preflight.then(()=>api.overlays(symbol,timeframe)).then(a=>{if(alive){setAnalysis(a);setAnalysisError(null)}}).catch(e=>{if(alive)setAnalysisError(e instanceof Error?e.message:String(e))})
    const timer=window.setInterval(()=>api.overlays(symbol,timeframe).then(a=>{if(alive){setAnalysis(a);setAnalysisError(null)}}).catch(e=>alive&&setAnalysisError(e instanceof Error?e.message:String(e))),20000)
    return()=>{alive=false;clearInterval(timer)}
  },[symbol,timeframe,isForex])

  const onCandle=useCallback((c:Candle)=>setCandles(prev=>{if(!prev.length)return[c];const copy=[...prev],last=copy[copy.length-1];if(last.open_time===c.open_time)copy[copy.length-1]=c;else copy.push(c);return copy.slice(-240)}),[])
  const stream=useMarketStream(symbol,timeframe,onCandle)
  const view=useMemo(()=>candles.slice(-90),[candles])
  const stats=useMemo(()=>{if(!view.length)return null;const hi=Math.max(...view.map(c=>c.high)),lo=Math.min(...view.map(c=>c.low)),last=view[view.length-1],first=view[0];return{hi,lo,last,change:(last.close-first.open)/first.open*100}},[view])
  const enabled=Object.values(overlays).filter(Boolean).length, toggle=(k:OverlayKey)=>setOverlays(v=>({...v,[k]:!v[k]}))
  const feedState=stream.state

  return <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#090d13] shadow-panel">
    <div className="flex flex-col gap-3 border-b border-white/[0.05] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-3"><div><div className="text-sm font-semibold text-white">{symbol}</div><div className="text-[10px] text-slate-500">{timeframe} • live candles + synchronized SMC overlays</div></div><Status state={feedState}/><span className="rounded-md border border-white/[0.06] px-2 py-1 text-[10px] text-slate-500">{enabled} overlays</span>{analysis&&<span className="rounded-md border border-sky-400/15 bg-sky-400/[0.05] px-2 py-1 text-[10px] text-sky-300">{analysis.smc.bias} · {analysis.smc.structure_event.replaceAll('_',' ')}</span>}</div>
      <div className="flex flex-wrap gap-1"><ToolButton active={tool==='Cursor'} onClick={()=>setTool('Cursor')} icon={MousePointer2}/><ToolButton active={tool==='Crosshair'} onClick={()=>setTool('Crosshair')} icon={Crosshair}/><ToolButton active={tool==='Zone'} onClick={()=>setTool('Zone')} icon={BoxSelect}/><ToolButton active={tool==='Measure'} onClick={()=>setTool('Measure')} icon={Ruler}/><button className="icon-btn"><SlidersHorizontal size={15}/></button><button className="icon-btn"><Maximize2 size={15}/></button></div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-4 py-2"><span className="mr-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-600"><Layers3 size={12}/> Layers</span>{overlayMeta.map(o=><button key={o.key} onClick={()=>toggle(o.key)} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] ${overlays[o.key]?'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300':'border-white/[0.05] bg-white/[0.02] text-slate-600'}`}>{overlays[o.key]?<Eye size={11}/>:<EyeOff size={11}/>} {o.short}</button>)}</div>
    <div className="relative h-[470px] bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:56px_56px]">
      {loading&&<Center text="Loading market history and analysis…"/>}{error&&<Center text={error}/>} {!loading&&!error&&view.length>0&&<LiveSvg candles={view} overlays={overlays} analysis={analysis}/>} {!loading&&!error&&view.length===0&&<Center text="No candle data"/>}
      {stats&&<div className="absolute left-3 top-3 z-10 rounded-xl border border-white/[0.06] bg-black/45 p-3 text-[10px] backdrop-blur"><div className="mb-1 text-slate-500">LIVE PRICE</div><div className="text-lg font-bold text-white">{fmt(stats.last.close)}</div><div className={stats.change>=0?'text-emerald-300':'text-rose-300'}>{stats.change>=0?'+':''}{stats.change.toFixed(2)}%</div><div className="mt-2 text-slate-600">H {fmt(stats.hi)} · L {fmt(stats.lo)}</div></div>}
      {analysis&&<div className="absolute bottom-3 right-3 z-10 max-w-[330px] rounded-xl border border-white/[0.06] bg-black/55 p-3 text-[10px] backdrop-blur"><div className="mb-2 font-semibold text-white">SMC context</div><div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500"><span>FVGs</span><b className="text-slate-300">{analysis.smc.active_fvgs.length}</b><span>Order blocks</span><b className="text-slate-300">{analysis.smc.order_blocks.length}</b><span>Session</span><b className="text-slate-300">{analysis.smc.session?.session||'—'}</b><span>PD zone</span><b className="text-slate-300">{analysis.smc.premium_discount?.zone||'—'}</b></div>{analysisError&&<div className="mt-2 text-amber-300">Overlay refresh delayed</div>}</div>}
    </div>
    <div className="grid grid-cols-2 border-t border-white/[0.05] text-[10px] md:grid-cols-5"><Foot label="Feed" value={feedState}/><Foot label="Candles" value={String(candles.length)}/><Foot label="Last update" value={stream.lastMessageAt?new Date(stream.lastMessageAt).toLocaleTimeString():'—'}/><Foot label="Analysis" value={analysis?new Date(analysis.generated_at*1000).toLocaleTimeString():'—'}/><Foot label="Execution" value="DISABLED"/></div>
  </div>
}

function LiveSvg({candles,overlays,analysis}:{candles:Candle[];overlays:Record<OverlayKey,boolean>;analysis:OverlayBundle|null}){
  const w=1000,h=420,p=22, rawLevels:number[]=[]
  analysis?.smc.active_fvgs.forEach(g=>rawLevels.push(g.low,g.high)); analysis?.smc.order_blocks.forEach(b=>rawLevels.push(b.low,b.high));
  const liq=analysis?.smc.liquidity; [...(liq?.buy_side_pools||[]),...(liq?.sell_side_pools||[])].forEach((x:any)=>rawLevels.push(x.price))
  const hi=Math.max(...candles.map(c=>c.high),...rawLevels.filter(Number.isFinite)),lo=Math.min(...candles.map(c=>c.low),...rawLevels.filter(Number.isFinite)),range=Math.max(hi-lo,1e-9)
  const y=(v:number)=>p+(hi-v)/range*(h-p*2),step=(w-p*2)/Math.max(candles.length,1),body=Math.max(2,Math.min(7,step*.62))
  const ema:number[]=[];const alpha=2/21;candles.forEach((c,i)=>ema.push(i?c.close*alpha+ema[i-1]*(1-alpha):c.close));const emaPath=ema.map((v,i)=>`${i?'L':'M'} ${p+i*step+step/2} ${y(v)}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
    {overlays.FVG&&analysis?.smc.active_fvgs.slice(-5).map((g:any,i:number)=><Zone key={`fvg${i}`} low={g.low} high={g.high} y={y} x={w*.58+i*12} width={w*.36-i*12} bullish={g.type==='BULLISH_FVG'} opacity={.08}/>) }
    {overlays['Order Blocks']&&analysis?.smc.order_blocks.slice(-4).map((b:any,i:number)=><Zone key={`ob${i}`} low={b.low} high={b.high} y={y} x={w*.68+i*8} width={w*.27-i*8} bullish={b.type==='BULLISH_OB'} opacity={b.state==='ACTIVE'?.12:.06}/>) }
    {overlays.Liquidity&&<>{(liq?.buy_side_pools||[]).slice(-3).map((x:any,i:number)=><PriceLine key={`b${i}`} price={x.price} y={y} label={`BSL ${x.touches}x`} color="#fb7185" w={w} p={p}/>)}{(liq?.sell_side_pools||[]).slice(-3).map((x:any,i:number)=><PriceLine key={`s${i}`} price={x.price} y={y} label={`SSL ${x.touches}x`} color="#a78bfa" w={w} p={p}/>)}</>}
    {candles.map((c,i)=>{const x=p+i*step+step/2,bull=c.close>=c.open,clr=bull?'#34d399':'#fb7185';return <g key={c.open_time}><line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={clr} strokeWidth="1"/><rect x={x-body/2} y={Math.min(y(c.open),y(c.close))} width={body} height={Math.max(1.5,Math.abs(y(c.open)-y(c.close)))} fill={clr} rx="1"/></g>})}
    {overlays.EMA&&<path d={emaPath} fill="none" stroke="#fbbf24" strokeWidth="1.3" opacity=".75"/>}
    {overlays.Structure&&analysis?.smc.structure_event!=='NONE'&&<g><rect x={w-210} y={34} width={170} height={26} rx={8} fill="#020617" opacity=".8"/><text x={w-125} y={51} textAnchor="middle" fill={analysis?.smc.structure_event.startsWith('BULLISH')?'#6ee7b7':'#fda4af'} fontSize="11" fontWeight="700">{analysis?.smc.structure_event.replaceAll('_',' ')}</text></g>}
  </svg>
}
function Zone({low,high,y,x,width,bullish,opacity}:{low:number;high:number;y:(v:number)=>number;x:number;width:number;bullish:boolean;opacity:number}){const top=Math.min(y(low),y(high)),height=Math.max(2,Math.abs(y(low)-y(high))),color=bullish?'#34d399':'#fb7185';return <rect x={x} width={Math.max(10,width)} y={top} height={height} fill={color} opacity={opacity} stroke={color} strokeOpacity=".35" strokeDasharray="4 3"/>}
function PriceLine({price,y,label,color,w,p}:{price:number;y:(v:number)=>number;label:string;color:string;w:number;p:number}){return <g><line x1={p} x2={w-p} y1={y(price)} y2={y(price)} stroke={color} opacity=".35" strokeDasharray="7 7"/><text x={w-p-4} y={y(price)-4} textAnchor="end" fill={color} fontSize="9">{label}</text></g>}
function Status({state}:{state:string}){const good=state==='LIVE',bad=state==='OFFLINE'||state==='STALE';return <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${good?'border-emerald-400/20 bg-emerald-400/10 text-emerald-300':bad?'border-rose-400/20 bg-rose-400/10 text-rose-300':'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{state}</span>}
function ToolButton({active,onClick,icon:Icon}:{active:boolean;onClick:()=>void;icon:typeof MousePointer2}){return <button onClick={onClick} className={`icon-btn ${active?'border-emerald-400/20 text-emerald-300':''}`}><Icon size={15}/></button>}
function Center({text}:{text:string}){return <div className="absolute inset-0 grid place-items-center px-8 text-center text-xs text-slate-500">{text}</div>}
function Foot({label,value}:{label:string;value:string}){return <div className="border-r border-white/[0.05] px-4 py-3 last:border-r-0"><div className="text-slate-600">{label}</div><div className="mt-1 font-semibold text-slate-300">{value}</div></div>}
function fmt(v:number){return v.toLocaleString(undefined,{maximumFractionDigits:v<1?8:2})}
