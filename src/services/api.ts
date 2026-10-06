const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const DEV_DIRECT_BASE = 'http://127.0.0.1:8000/api/v1'
const RELATIVE_BASE = '/api/v1'

function apiCandidates() {
  if (configuredBase) return [configuredBase]
  if (typeof window !== 'undefined' && ['localhost','127.0.0.1'].includes(window.location.hostname)) {
    return [DEV_DIRECT_BASE, RELATIVE_BASE]
  }
  return [RELATIVE_BASE]
}

export type Candle = {
  open_time:number; close_time:number; open:number; high:number; low:number; close:number; volume:number; closed:boolean;
}
export type ScannerItem = {
  symbol:string; timeframe:string; direction:string; grade:string; score:number; state:string; rr:number|null;
  entry_low:number|null; entry_high:number|null; stop_loss:number|null; take_profits:number[]; setup:string[]; news_risk:string|null;
  action?:string; signal_threshold?:number;
}
export type SignalHistoryItem = {
  id:number; created_at:string; symbol:string; timeframe:string; direction:string; grade:string; score:number;
  state:string; entry_low:number|null; entry_high:number|null; stop_loss:number|null; rr:number|null;
  take_profits:number[]; setup:string[]; news_risk:string|null;
}
export type TradeItem = {
  id:number; created_at:string; closed_at:string|null; symbol:string; timeframe:string; direction:string;
  entry:number; stop_loss:number; exit_price:number|null; pnl:number; result:string; grade:string; score:number; rr:number|null; setup:string[];
}
export type NotificationItem = {
  id:number; created_at:string; kind:string; title:string; message:string; symbol:string|null; timeframe:string|null; severity:string; read:number;
}
export type MtfItem = { timeframe:string; bias:string; event:string }
export type MtfResponse = { alignment:string; items:MtfItem[]; bullish_count:number; bearish_count:number }
export type OverlayBundle = {
  symbol:string; timeframe:string; generated_at:number;
  smc:{ bias:string; structure_event:string; active_fvgs:any[]; inverse_fvgs:any[]; order_blocks:any[]; liquidity:any; premium_discount:any; previous_extremes:any; previous_level_sweeps:any; session:any };
  trade_levels:any;
}
export type CalendarEvent = { title:string; datetime:string; impact:string; currency:string; country:string; source:string; actual:any; forecast:any; previous:any }
export type BacktestResult = { symbol:string; timeframe:string; trades:number; wins:number; losses:number; timeouts:number; win_rate:number; gross_r:number; costs_r:number; net_r:number; profit_factor:number; expectancy_r:number; max_drawdown_r:number; sharpe_like:number; avg_holding_bars:number; long_win_rate:number; short_win_rate:number; no_future_leakage:boolean; same_bar_policy:string; cost_model:{fee_bps:number;slippage_bps:number;funding_bps_8h:number}; items:any[] }
export type WalkForwardResult = { symbol:string; timeframe:string; folds_requested:number; folds_tested:number; positive_folds:number; consistency_pct:number; items:any[] }
export type OptimizeResult = { symbol:string; timeframe:string; best:any; candidates:any[]; warning:string }
export type DailyRisk = { date?:string; realized_pnl?:number; open_trades?:number; consecutive_losses?:number; wins?:number; losses?:number; total_trades?:number; win_rate?:number; status?:string }

async function fetchOnce<T>(base:string, path:string, init?:RequestInit):Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
      signal: init?.signal || controller.signal,
    })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok) {
      const raw = await response.text().catch(()=> '')
      let message = ''
      try {
        const parsed = JSON.parse(raw)
        message = typeof parsed?.detail === 'string' ? parsed.detail : ''
      } catch { message = '' }
      if (response.status === 429) message = 'Forex feed is rate limited. Cached data will be used when available.'
      throw new Error(message || `Market service temporarily unavailable (${response.status})`)
    }
    if (!contentType.includes('application/json')) {
      throw new Error('Market API returned non-JSON data.')
    }
    return response.json() as Promise<T>
  } finally {
    clearTimeout(timeout)
  }
}

async function backendReachable():Promise<boolean> {
  const bases = apiCandidates()
  // A single slow health probe should not flip the whole UI offline.
  for (let attempt=0; attempt<2; attempt++) {
    for (const base of bases) {
      const controller = new AbortController()
      const timer = window.setTimeout(()=>controller.abort(), 4000)
      try {
        const r = await fetch(`${base}/health`, { signal: controller.signal, cache: 'no-store' })
        if (r.ok) return true
      } catch {} finally { window.clearTimeout(timer) }
    }
    if(attempt===0) await new Promise(resolve=>window.setTimeout(resolve,350))
  }
  return false
}

async function request<T>(path:string, init?:RequestInit):Promise<T> {
  const candidates = apiCandidates()
  let lastError:unknown = null
  for (let i=0;i<candidates.length;i++) {
    try {
      return await fetchOnce<T>(candidates[i], path, init)
    } catch (err) {
      lastError = err
      const isLast = i === candidates.length - 1
      if (isLast) break
      // Retry on network/proxy failures only; backend HTTP errors should not be hidden by fallback.
      const msg = err instanceof Error ? err.message : String(err)
      const networkish = msg.includes('Failed to fetch') || msg.includes('non-JSON') || msg.includes('aborted') || msg.includes('NetworkError')
      if (!networkish) break
    }
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError || 'Unknown network error')
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('aborted')) {
    // A heavy analysis endpoint can time out even while WebSocket + backend are healthy.
    // Verify the lightweight health endpoint before declaring a full backend outage.
    if (await backendReachable()) {
      throw new Error('Analysis is temporarily delayed. Live market data is still connected; retrying automatically.')
    }
    throw new Error('Backend connection is unavailable. Start the backend on port 8000, then refresh the page.')
  }
  throw lastError instanceof Error ? lastError : new Error(msg)
}

export const api = {
  health: () => request<{status:string; environment:string}>('/health'),
  symbols: (market:'FOREX'|'FUTURES') => request<{market:string;symbols:string[]}>(`/markets/symbols?market=${market}`),
  candles: (symbol:string,timeframe:string,limit=300) => request<{symbol:string;timeframe:string;count:number;items:Candle[];feed_state?:string;retry_in_seconds?:number}>(`/markets/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`),
  signal: (symbol:string,timeframe:string) => request<any>(`/signals/current?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  scanner: (market:string,timeframe?:string) => request<any>(`/scanner?market=${encodeURIComponent(market)}${timeframe?`&timeframe=${encodeURIComponent(timeframe)}`:''}`),
  newsRisk: (symbol:string) => request<any>(`/news/risk?symbol=${encodeURIComponent(symbol)}`),
  calendar: (hoursBefore=6,hoursAfter=36) => request<{state:string;provider:string;items:CalendarEvent[]}>(`/news/calendar?hours_before=${hoursBefore}&hours_after=${hoursAfter}`),
  macroContext: (symbol:string) => request<any>(`/news/macro-context?symbol=${encodeURIComponent(symbol)}`),
  backtest: (symbol:string,timeframe:string) => request<BacktestResult>(`/backtest/run?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  walkForward: (symbol:string,timeframe:string) => request<WalkForwardResult>(`/backtest/walk-forward?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  optimizeBacktest: (symbol:string,timeframe:string) => request<OptimizeResult>(`/backtest/optimize?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  signalHistory: (limit=100) => request<{items:SignalHistoryItem[]}>(`/signals/history?limit=${limit}`),
  trades: (limit=100) => request<{items:TradeItem[]}>(`/journal/trades?limit=${limit}`),
  notifications: (unreadOnly=false,limit=100) => request<{items:NotificationItem[]}>(`/notifications?unread_only=${unreadOnly}&limit=${limit}`),
  markNotificationRead: (id:number) => request<{status:string;id:number}>(`/notifications/${id}/read`,{method:'POST'}),
  markAllNotificationsRead: () => request<{status:string;count:number}>('/notifications/read-all',{method:'POST'}),
  dailyRisk: () => request<DailyRisk>('/risk/daily'),
  dashboardSummary: () => request<any>('/dashboard/summary'),
  multiTimeframe: (symbol:string,timeframe:string) => request<MtfResponse>(`/analysis/multi-timeframe?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  overlays: (symbol:string,timeframe:string) => request<OverlayBundle>(`/analysis/overlays?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  forexStatus: () => request<any>('/markets/forex/status'),
  dataHealth: (symbol:string,timeframe:string) => request<any>(`/system/data-health?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  notificationChannels: () => request<any>('/system/notification-channels'),
  readiness: () => request<any>('/system/readiness'),
  releaseChecks: () => request<any>('/system/release-checks'),
  newsAwareBacktestReadiness: () => request<any>('/backtest/news-aware-readiness'),
  stressCosts: (symbol:string,timeframe:string) => request<any>(`/backtest/stress-costs?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  positionSize: (payload:unknown) => request<any>('/risk/position-size',{method:'POST',body:JSON.stringify(payload)}),
}
