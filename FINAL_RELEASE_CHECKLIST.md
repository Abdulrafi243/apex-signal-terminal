# Final Release Checklist — v1.0

## Code scope
- [x] Frontend dashboard and responsive navigation
- [x] Backend API and WebSocket stream
- [x] Binance Futures market-data path
- [x] Forex provider adapter and configuration guard
- [x] SMC/ICT confluence engine
- [x] Multi-timeframe engine
- [x] News lock and unknown-feed downgrade
- [x] Entry / SL / TP / invalidation levels
- [x] Risk sizing and trade gate
- [x] Notifications and deduplication
- [x] Journal and signal history
- [x] Conservative backtesting / walk-forward / cost stress
- [x] Stale-data guard
- [x] Docker/nginx production routing
- [x] Readiness and release-check endpoints
- [x] Demo-only status claims removed from active dashboard

## Deployment inputs still supplied by the operator
- [ ] `TWELVE_DATA_API_KEY` for live XAUUSD/BTCUSD Forex
- [ ] Live economic-calendar provider URL/key
- [ ] Point-in-time historical-news provider for news-aware historical evidence
- [ ] Telegram/Webhook credentials only if those channels are desired
- [ ] Run `npm install && npm run build` in CI/deployment environment
- [ ] Perform paper-trading/forward validation before trusting capital

## Safety / execution
- [x] Automatic live order execution is OFF
- [x] High-impact news can block a signal
- [x] Unknown news feed downgrades LIVE to REVIEW
- [x] Stale/unhealthy market data downgrades LIVE to REVIEW
- [x] Risk gates can block A/A+ signals

**Project code scope: complete. Production activation depends on external provider credentials and forward validation.**
