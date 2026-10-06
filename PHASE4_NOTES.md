# Phase 4 — Frontend completion foundation + Backend skeleton

## Added
- Searchable Forex/Futures symbol picker.
- Futures working universe through PEPEUSDT.
- Scanner filter bar for timeframe, grade, score, R:R, news safety and HTF alignment.
- Frontend API client with environment-configurable base URL.
- FastAPI backend skeleton with health, symbols, current signal, scanner and news-risk contracts.
- Clear provider/service boundaries for market data, signal engine and news risk.
- Live trading intentionally disabled.

## Next
1. Real Binance Futures REST/WebSocket adapter.
2. Forex data provider for XAUUSD/BTCUSD.
3. Candle normalization/cache.
4. SMC/ICT analysis engine: pivots, BOS/CHoCH/MSS, FVG, OB, liquidity and displacement.
5. News calendar adapter and protected event windows.
6. Browser push backend + persistent alert rules.
