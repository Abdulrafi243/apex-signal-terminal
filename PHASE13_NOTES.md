# Phase 13 — Backtesting V2

- Transaction-cost model: maker/taker-style configurable fee bps, slippage bps, estimated funding bps per 8 hours.
- Metrics now distinguish gross R, modeled costs, and net R.
- Long/short win rates, average holding bars and equity curve were added.
- Same-bar ambiguity stays conservative: STOP_FIRST.
- Walk-forward endpoint splits history into sequential out-of-sample-style folds and reports consistency.
- Score-threshold optimizer tests a small explicit grid and warns that the selected result must be validated out-of-sample.
- No-future-leakage guarantee remains in the replay engine.
- Historical news replay is NOT claimed complete: a provider with point-in-time historical economic-calendar data is still required before news-aware backtests are production evidence.
