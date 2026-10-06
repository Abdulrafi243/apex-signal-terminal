# Apex Signal Terminal v1.0.8 — Final Decision Engine Checklist

- [x] Current panel uses BUY NOW / SELL NOW / WAIT FOR ENTRY / WAIT FOR CONFIRMATION / NO TRADE
- [x] Base actionable signal threshold is 80/100
- [x] Lower-timeframe noise thresholds: 5M=84, 1M=88
- [x] 88–91 marked strong; 92–100 marked A+ quality
- [x] At least 3 of 4 professional core confirmations required
- [x] One non-critical core condition may be absent
- [x] Secondary confirmations are weighted, not individually mandatory
- [x] Fresh entry guard remains enforced
- [x] TP1-already-reached / missed / invalidated / stale setups cannot become BUY NOW / SELL NOW
- [x] News high-impact lock overrides score
- [x] Unverified news forces WAIT FOR CONFIRMATION
- [x] Minimum R:R 1:2 for executable signal
- [x] Data freshness gate remains enforced
- [x] Entry / SL / TP1 / TP2 / TP3 remain visible for qualified waiting setups
- [x] 80+ actionable signals can notify
- [x] Signal score is labeled as quality/confluence score, not win probability
- [x] Backtest default threshold moved to 80
- [x] Backend compile/import validation passed
- [x] 42 API/WebSocket routes registered

Automatic order execution remains intentionally disabled.
