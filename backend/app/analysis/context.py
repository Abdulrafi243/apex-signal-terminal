from __future__ import annotations
from datetime import datetime, timezone
from app.models.candle import Candle
from app.analysis.market_structure import pivots


def previous_extremes(candles: list[Candle]) -> dict:
    if not candles:
        return {}
    by_day: dict[str, list[Candle]] = {}
    by_week: dict[str, list[Candle]] = {}
    for c in candles:
        dt = datetime.fromtimestamp(c.open_time / 1000, tz=timezone.utc)
        by_day.setdefault(dt.strftime('%Y-%m-%d'), []).append(c)
        year, week, _ = dt.isocalendar()
        by_week.setdefault(f'{year}-W{week:02d}', []).append(c)
    days = sorted(by_day)
    weeks = sorted(by_week)
    prev_day = by_day[days[-2]] if len(days) >= 2 else []
    prev_week = by_week[weeks[-2]] if len(weeks) >= 2 else []
    return {
        'previous_day_high': max((x.high for x in prev_day), default=None),
        'previous_day_low': min((x.low for x in prev_day), default=None),
        'previous_week_high': max((x.high for x in prev_week), default=None),
        'previous_week_low': min((x.low for x in prev_week), default=None),
    }


def session_context(candles: list[Candle]) -> dict:
    if not candles:
        return {'session':'UNKNOWN','kill_zone':'NONE'}
    dt = datetime.fromtimestamp(candles[-1].close_time / 1000, tz=timezone.utc)
    h = dt.hour + dt.minute / 60
    if 0 <= h < 8:
        session = 'ASIA'
    elif 8 <= h < 13:
        session = 'LONDON'
    elif 13 <= h < 21:
        session = 'NEW_YORK'
    else:
        session = 'OFF_HOURS'
    # Approximate UTC windows; configurable later by DST-aware calendar service.
    if 7 <= h < 10:
        kz = 'LONDON_KILL_ZONE'
    elif 12.5 <= h < 15.5:
        kz = 'NEW_YORK_KILL_ZONE'
    else:
        kz = 'NONE'
    return {'session':session,'kill_zone':kz,'utc_hour':round(h,2)}


def ote_zone(candles: list[Candle], direction: str) -> dict:
    ps = pivots(candles)
    highs = [p.price for p in ps if p.kind == 'HIGH']
    lows = [p.price for p in ps if p.kind == 'LOW']
    if not highs or not lows:
        return {}
    hi, lo = highs[-1], lows[-1]
    if hi <= lo:
        hi, lo = max(hi, lo), min(hi, lo)
    rng = hi - lo
    if rng <= 0:
        return {}
    if direction == 'LONG':
        z1, z2 = hi - 0.79*rng, hi - 0.62*rng
    else:
        z1, z2 = lo + 0.62*rng, lo + 0.79*rng
    price = candles[-1].close
    low, high = min(z1,z2), max(z1,z2)
    return {'low':low,'high':high,'in_ote':low <= price <= high,'swing_low':lo,'swing_high':hi}


def level_sweeps(candles: list[Candle], levels: dict) -> dict:
    if not candles:
        return {}
    c = candles[-1]
    out = {}
    for name, level in levels.items():
        if level is None:
            out[name.replace('previous_','') + '_swept'] = False
            continue
        is_high = name.endswith('_high')
        swept = (c.high > level and c.close < level) if is_high else (c.low < level and c.close > level)
        out[name.replace('previous_','') + '_swept'] = swept
    return out
