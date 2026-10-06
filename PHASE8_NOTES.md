# Phase 8 — Risk, Persistence & Notification Backend

Added:
- Account risk profile and professional risk gate
- Position sizing from balance, risk %, entry and stop
- Daily loss lock
- Consecutive-loss lock
- Max open-trades lock
- Maximum leverage guard
- SQLite persistence for development
- Signal history persistence
- Trade journal persistence
- Notification persistence
- A/A+ live signal alert generation
- Daily risk statistics endpoint

Important: auto-execution remains disabled. This phase controls whether a setup is risk-permitted; it does not place orders.
