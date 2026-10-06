# Apex Signal Terminal v1.0

A signal-only Forex + Binance Futures decision-support terminal built around live market data, SMC/ICT confluence, multi-timeframe context, news guards, risk controls, notifications, journaling and conservative backtesting.

## Scope completed
- React + TypeScript + Vite + Tailwind frontend
- FastAPI backend
- Binance USD-M Futures REST/WebSocket market data
- XAUUSD/BTCUSD Forex adapter through Twelve Data
- SMC/ICT analysis: structure, BOS/CHoCH, FVG/IFVG, order blocks, breaker/mitigation states, liquidity pools/sweeps, premium/discount, OTE, displacement, sessions/kill-zones, previous day/week extremes
- Multi-timeframe alignment
- Entry / invalidation / ATR-based SL / TP engine
- News-risk and economic-calendar interfaces with high-impact locking
- Position sizing and account risk gates
- Signal/trade/notification persistence
- Browser notifications plus optional Telegram/webhook delivery
- Backtesting with fees, slippage, funding, walk-forward validation, score-threshold studies and cost stress tests
- Live chart overlays and scanner
- Production data-health and stale-feed guards
- Docker + nginx deployment with API and WebSocket reverse proxy
- Final release/readiness checks

## Important trading rule
Automatic exchange order execution is intentionally disabled. The system is a signal and decision-support terminal. A signal can be `LIVE`, `REVIEW`, or `NO_TRADE`; risk, news and data-health guards can block technically strong setups.

## Required configuration
Copy `backend/.env.example` to `backend/.env`.

For Binance Futures market data, no private exchange key is required for public candles/streams.

For live Forex:
```env
FOREX_DATA_PROVIDER=twelvedata
TWELVE_DATA_API_KEY=YOUR_KEY
```

For economic calendar/news, configure the provider-neutral URLs and key:
```env
NEWS_CALENDAR_URL=...
NEWS_HISTORICAL_URL=...
NEWS_API_KEY=...
```
`NEWS_HISTORICAL_URL` must be point-in-time capable for news-aware historical evidence. Revised future macro values are intentionally rejected as a substitute.

Optional external notifications:
```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
NOTIFICATION_WEBHOOK_URL=...
```

## Development
Backend:
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
npm install
npm run dev
```
Vite proxies `/api` and `/ws` to the local backend.

## Production with Docker
```bash
docker compose up --build -d
```
Frontend: `http://localhost:8080`
Backend docs: `http://localhost:8000/docs`

The production frontend uses same-origin `/api/v1` and `/ws` paths through nginx, avoiding incorrect browser-side `localhost:8000` routing on remote servers.

## Readiness endpoints
- `GET /api/v1/system/readiness`
- `GET /api/v1/system/release-checks`
- `GET /api/v1/backtest/news-aware-readiness`

## Validation status in this release environment
- Backend Python compile/import: PASS
- FastAPI route registration: PASS
- Release checks: PASS
- Signal model mutable-default guard: PASS
- TypeScript/TSX syntax transpilation: PASS
- Full frontend dependency build: not executable in the current build environment because `npm install` network access timed out; run `npm install && npm run build` on the deployment machine/CI before release.

See `FINAL_RELEASE_CHECKLIST.md` and `PHASE16_NOTES.md`.

## v1.0.6 stability release
See `FIX_1_0_6.md`. News, Economic Calendar and Backtesting pages have defensive rendering; signal history includes TP1/TP2/TP3; live WebSocket candles are synchronized into the analysis cache; and stale setups older than 12 bars cannot be advertised as fresh live signals.

## v1.0.8 current-decision policy
The terminal now uses a professional core/secondary confirmation model. Qualified actionable signals begin at a unified 70/100 quality score on all timeframes. BUY NOW / SELL NOW is only emitted when the current price is at a fresh executable entry and hard risk/news/data gates pass. The quality score is not a probability of profit.


## v1.0.11 — Dynamic Current-Price Plan
- 70+ score remains the unified signal threshold.
- If an older entry plan is no longer actionable, the engine can rebuild a fresh execution plan around the synchronized current quote using ATR + recent swing structure.
- UNKNOWN news is shown as a warning instead of automatically blocking a technically valid setup; HIGH/locked news still blocks execution.
- 70–79 requires at least 2/4 core confirmations; 80+ requires 3/4.
- Current plans remain protected by direction/SL/TP sanity invariants.
