# Phase 12 — News Engine + Economic Calendar + Backtesting Foundation

- Provider-neutral live economic calendar ingestion and normalization
- HIGH/MEDIUM/LOW event classification
- Gold/BTC/USDT macro relevance filters
- Pre-news and post-news hard lock preserved
- Unconfigured/unavailable provider returns UNKNOWN, never fake LOW risk
- Live News page + Economic Calendar frontend API connection
- Backtesting engine foundation with rolling historical replay
- Explicit no-future-leakage rule
- Conservative stop-first handling if SL and TP are touched in the same bar
- Metrics: win rate, net R, profit factor, expectancy, max drawdown R, Sharpe-like statistic
- Production gaps still explicit: point-in-time historical news, fees, slippage, funding, spread, latency, walk-forward validation
