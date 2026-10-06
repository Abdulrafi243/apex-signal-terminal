# Phase 16 — Final completion and release hardening

- Removed misleading default MOCK signal state from the backend response model.
- Replaced mutable Pydantic list defaults with `default_factory`.
- Added production/readiness checks and a release-check API.
- Added an explicit historical-news backtest readiness guard.
- Final release remains signal-only; automatic exchange order execution is intentionally disabled.
- Forex live data requires a Twelve Data API key.
- News-aware historical evidence requires a point-in-time capable historical calendar provider.
- Dashboard demo-only status claims were removed/reworded in favor of live or neutral system state.
- Added release validation script and final checklist/documentation.
