# Phase 5 — Real Market Data + SMC Engine 1

Implemented:
- Binance USD-M Futures REST kline client (`/fapi/v1/klines`)
- Live perpetual USDT symbol discovery (`/fapi/v1/exchangeInfo`)
- WebSocket kline stream adapter with reconnect/backoff
- Normalized Candle model
- Supported timeframes: 1M, 5M, 15M, 30M, 1H, 4H, 1D
- Swing pivot detection
- HH/HL vs LH/LL market-structure bias
- First-pass BOS / CHoCH detection
- Three-candle Fair Value Gap detection + fill filtering
- Equal-high/equal-low liquidity pools and simple sweep detection
- First live SMC confluence scoring engine
- New API routes: candles, live Binance symbols, SMC analysis

Safety/design note:
- Auto-execution remains disabled.
- News risk is still a placeholder and is not yet allowed to certify a signal as news-safe.
- Order Blocks, displacement quality, ATR risk levels, multi-timeframe confluence, and robust liquidity logic are Phase 6+ work.
