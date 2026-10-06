# Phase 7 — Advanced Context & News Guardrails

Added:
- Shared market-structure module to remove circular imports.
- Advanced clustered liquidity pools and sweeps.
- Inverse Fair Value Gap (IFVG) detection.
- Previous-day / previous-week high-low context and sweep detection.
- Premium/discount retained, plus OTE 62–79% retracement zone.
- UTC session and approximate London/New York kill-zone context.
- Provider-neutral economic-calendar adapter with pre/post news lock windows.
- Signal guardrail: HIGH-impact news => NO_TRADE; unverified news feed => REVIEW, not LIVE.
- `/analysis/context` endpoint.

Important: kill-zone windows are approximate UTC windows in this phase. Production should use a DST-aware trading-session calendar. Live news requires provider configuration in `.env`.
