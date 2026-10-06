from __future__ import annotations


def required_score_for_timeframe(timeframe: str) -> int:
    """Unified execution threshold requested by the user.

    A score of 70+ makes a setup eligible for BUY NOW / SELL NOW, but the
    hard safety gates, 3-of-4 professional core confirmations, and fresh
    executable entry rules still have to pass.
    """
    return 70


def decide_current_action(*, timeframe: str, score: int, direction: str, rr: float | None,
                          entry_status: str, data_ok: bool, news_risk: str, news_locked: bool,
                          core_confirmations: dict[str, bool], secondary_confirmations: dict[str, bool]) -> dict:
    threshold = required_score_for_timeframe(timeframe)
    core_passed = [k for k, v in core_confirmations.items() if v]
    core_missing = [k for k, v in core_confirmations.items() if not v]
    secondary_passed = [k for k, v in secondary_confirmations.items() if v]

    # These are true hard gates. Secondary evidence may be absent without rejecting
    # an otherwise professional-quality setup.
    hard_failures: list[str] = []
    if direction not in {'LONG', 'SHORT'}:
        hard_failures.append('No directional edge')
    if not data_ok:
        hard_failures.append('Market data is stale/unhealthy')
    if news_locked or news_risk == 'HIGH':
        hard_failures.append('High-impact news lock')
    if rr is None or rr < 2.0:
        hard_failures.append('Risk/reward below 1:2')
    if entry_status in {'MISSED', 'TP_ALREADY_REACHED', 'INVALIDATED', 'STALE_SETUP', 'UNAVAILABLE'}:
        hard_failures.append('No fresh executable entry')

    # Adaptive professional core gate: 70-79 requires at least 2/4 core confirmations;
    # 80+ requires 3/4. This keeps the 70 threshold usable without turning it into
    # a random-score trigger.
    required_core = 3 if score >= 80 else 2
    core_ok = len(core_passed) >= required_core

    if hard_failures:
        return {
            'decision': 'NO TRADE',
            'state': 'NO_TRADE',
            'threshold': threshold,
            'core_ok': core_ok,
            'core_passed': core_passed,
            'core_missing': core_missing,
            'secondary_passed': secondary_passed,
            'missing_confirmations': core_missing,
            'reason': hard_failures[0],
        }

    if score < threshold:
        # Direction exists but quality is not yet high enough for a signal.
        return {
            'decision': 'WAIT FOR CONFIRMATION' if score >= 70 else 'NO TRADE',
            'state': 'REVIEW' if score >= 70 else 'NO_TRADE',
            'threshold': threshold,
            'core_ok': core_ok,
            'core_passed': core_passed,
            'core_missing': core_missing,
            'secondary_passed': secondary_passed,
            'missing_confirmations': core_missing,
            'reason': f'Quality score {score}/100 is below the {threshold}/100 execution threshold',
        }

    if not core_ok:
        return {
            'decision': 'WAIT FOR CONFIRMATION',
            'state': 'REVIEW',
            'threshold': threshold,
            'core_ok': False,
            'core_passed': core_passed,
            'core_missing': core_missing,
            'secondary_passed': secondary_passed,
            'missing_confirmations': core_missing,
            'reason': f'Need at least {required_core} of 4 core confirmations for this score band',
        }

    if entry_status == 'WAIT_ENTRY':
        return {
            'decision': 'WAIT FOR ENTRY',
            'state': 'REVIEW',
            'threshold': threshold,
            'core_ok': True,
            'core_passed': core_passed,
            'core_missing': core_missing,
            'secondary_passed': secondary_passed,
            'missing_confirmations': [],
            'reason': 'Setup is qualified; wait for price to reach the fresh entry zone',
        }

    if entry_status in {'IN_ENTRY', 'NEAR_ENTRY'}:
        decision = 'BUY NOW' if direction == 'LONG' else 'SELL NOW'
        return {
            'decision': decision,
            'state': 'LIVE',
            'threshold': threshold,
            'core_ok': True,
            'core_passed': core_passed,
            'core_missing': core_missing,
            'secondary_passed': secondary_passed,
            'missing_confirmations': [],
            'reason': ('Fresh entry is actionable; news feed unverified — technical signal only' if news_risk == 'UNKNOWN' else 'Fresh entry is actionable and professional core gates are satisfied'),
        }

    return {
        'decision': 'NO TRADE',
        'state': 'NO_TRADE',
        'threshold': threshold,
        'core_ok': core_ok,
        'core_passed': core_passed,
        'core_missing': core_missing,
        'secondary_passed': secondary_passed,
        'missing_confirmations': core_missing,
        'reason': 'No fresh executable setup',
    }
