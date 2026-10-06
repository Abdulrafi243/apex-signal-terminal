# Phase 14 — Forex Live Foundation + Reliability Hardening

## Added
- Twelve Data Forex adapter for XAU/USD and BTC/USD.
- REST historical candles through `/time_series`.
- WebSocket tick streaming with server-side timeframe candle aggregation.
- Unified data router so Binance Futures and Forex share the same analysis endpoints.
- Forex now works through the normal chart/analysis pipeline when configured.
- Provider guard remains strict: missing key => NOT_CONFIGURED, never fake LIVE.
- Historical point-in-time news provider interface (`/news/historical`).
- SMC setup-quality metadata: volatility regime + FVG/Order-Block overlap.
- Signal scoring bonus for compatible FVG + OB overlap and qualified volatility expansion.
- Notification dedupe/cooldown to prevent repeated A/A+ alerts.
- WebSocket route now routes both Futures and Forex streams through the unified data router.

## Required environment variables for Forex
```
FOREX_DATA_PROVIDER=twelvedata
TWELVE_DATA_API_KEY=your_key_here
TWELVE_DATA_BASE=https://api.twelvedata.com
TWELVE_DATA_WS=wss://ws.twelvedata.com/v1/quotes/price
```

## Historical news
`NEWS_HISTORICAL_URL` must point to a provider capable of point-in-time historical economic calendar data. If not configured, historical-news backtests remain explicitly unavailable rather than using revised/future information.

## Validation
- Python compile: PASS
- SMC setup-quality runtime: PASS
- Forex configuration guard: PASS
- Notification dedupe: PASS
- Historical news route registration: PASS
- Unified WebSocket route registration: PASS

Automatic trade execution remains disabled.
