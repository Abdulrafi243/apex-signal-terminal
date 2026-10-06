from __future__ import annotations

from statistics import mean
from app.models.candle import Candle
from app.analysis.market_structure import pivots


def true_range(c: Candle, prev_close: float) -> float:
    return max(c.high - c.low, abs(c.high - prev_close), abs(c.low - prev_close))


def atr(candles: list[Candle], period: int = 14) -> float:
    if len(candles) < period + 1:
        return 0.0
    trs = [true_range(candles[i], candles[i-1].close) for i in range(1, len(candles))]
    return mean(trs[-period:])


def displacement(candles: list[Candle], lookback: int = 20) -> dict:
    if len(candles) < lookback + 1:
        return {'direction': 'NONE', 'strength': 0.0}
    recent = candles[-lookback:]
    bodies = [abs(c.close-c.open) for c in recent[:-1]]
    avg_body = mean(bodies) if bodies else 0.0
    last = recent[-1]
    body = abs(last.close-last.open)
    strength = body / max(avg_body, 1e-9)
    direction = 'BULLISH' if last.close > last.open else 'BEARISH' if last.close < last.open else 'NONE'
    return {'direction': direction, 'strength': round(strength, 2), 'qualified': strength >= 1.5}


def order_blocks(candles: list[Candle], window: int = 40) -> list[dict]:
    out: list[dict] = []
    start = max(1, len(candles)-window)
    for i in range(start, len(candles)-1):
        c, nxt = candles[i], candles[i+1]
        # Last opposite candle before impulsive continuation.
        if c.close < c.open and nxt.close > nxt.open and nxt.close > c.high:
            out.append({'type':'BULLISH_OB','index':i,'low':c.low,'high':c.high,'mid':(c.low+c.high)/2})
        elif c.close > c.open and nxt.close < nxt.open and nxt.close < c.low:
            out.append({'type':'BEARISH_OB','index':i,'low':c.low,'high':c.high,'mid':(c.low+c.high)/2})
    return out[-8:]


def block_state(block: dict, candles: list[Candle]) -> str:
    later = candles[block['index']+1:]
    if block['type'] == 'BULLISH_OB':
        invalid = any(c.close < block['low'] for c in later)
        touched = any(c.low <= block['high'] and c.high >= block['low'] for c in later)
    else:
        invalid = any(c.close > block['high'] for c in later)
        touched = any(c.high >= block['low'] and c.low <= block['high'] for c in later)
    if invalid: return 'BREAKER'
    if touched: return 'MITIGATED'
    return 'ACTIVE'


def enrich_blocks(candles: list[Candle]) -> list[dict]:
    return [{**b, 'state': block_state(b, candles)} for b in order_blocks(candles)]


def premium_discount(candles: list[Candle]) -> dict:
    ps = pivots(candles)
    highs = [p.price for p in ps if p.kind == 'HIGH']
    lows = [p.price for p in ps if p.kind == 'LOW']
    hi = highs[-1] if highs else max(c.high for c in candles[-50:])
    lo = lows[-1] if lows else min(c.low for c in candles[-50:])
    eq = (hi+lo)/2
    price = candles[-1].close
    zone = 'DISCOUNT' if price < eq else 'PREMIUM' if price > eq else 'EQUILIBRIUM'
    return {'range_low':lo,'range_high':hi,'equilibrium':eq,'zone':zone}


def trade_levels(candles: list[Candle], direction: str, rr_targets=(1.0,2.0,3.0), max_setup_age_bars: int = 12) -> dict:
    a = atr(candles)
    if a <= 0:
        return {}
    price = candles[-1].close
    blocks = enrich_blocks(candles)
    wanted = 'BULLISH_OB' if direction == 'LONG' else 'BEARISH_OB'
    current_index = len(candles) - 1
    candidates = [
        b for b in blocks
        if b['type'] == wanted
        and b['state'] != 'BREAKER'
        and isinstance(b.get('index'), int)
        and 0 <= current_index - int(b['index']) <= max_setup_age_bars
    ]
    block = candidates[-1] if candidates else None
    if block:
        entry_low, entry_high = block['low'], block['high']
        entry = (entry_low+entry_high)/2
    else:
        entry = price
        entry_low, entry_high = price-a*0.15, price+a*0.15

    if direction == 'LONG':
        invalidation = min((block['low'] if block else price), min(c.low for c in candles[-10:]))
        sl = invalidation - a*0.25
        risk = max(entry-sl, a*0.5)
        tps = [entry + risk*x for x in rr_targets]
    else:
        invalidation = max((block['high'] if block else price), max(c.high for c in candles[-10:]))
        sl = invalidation + a*0.25
        risk = max(sl-entry, a*0.5)
        tps = [entry - risk*x for x in rr_targets]
    return {
        'atr': a, 'entry_low': min(entry_low,entry_high), 'entry_high': max(entry_low,entry_high),
        'entry': entry, 'stop_loss': sl, 'invalidation': invalidation,
        'take_profits': tps, 'rr': rr_targets[-1], 'order_block': block,
    }



def dynamic_trade_levels(candles: list[Candle], direction: str, rr_targets=(1.0, 2.0, 3.0), pivot_lookback: int = 24) -> dict:
    """Build a fresh NOW-plan anchored to the synchronized current price.

    This is a fallback execution model used only after the quality/direction/data
    gates have already passed but an older OB/FVG plan is no longer actionable.
    The stop blends ATR with the nearest recent structural swing, while targets
    are expressed as R-multiples. The live price is intentionally inside the
    entry zone so the result can be evaluated immediately by the decision engine.
    """
    if not candles or direction not in {'LONG', 'SHORT'}:
        return {}
    a = atr(candles)
    if a <= 0:
        return {}

    price = float(candles[-1].close)
    # Keep the current quote inside a compact execution zone instead of reusing a
    # historical order block that may now sit far behind price.
    zone_half = max(a * 0.08, abs(price) * 0.00002)
    entry_low = price - zone_half
    entry_high = price + zone_half
    entry = price

    ps = pivots(candles)
    min_index = max(0, len(candles) - pivot_lookback)

    if direction == 'LONG':
        swing_lows = [p.price for p in ps if p.kind == 'LOW' and p.index >= min_index and p.price < price]
        structural = max(swing_lows) if swing_lows else min(c.low for c in candles[-min(pivot_lookback, len(candles)):])
        structural_sl = structural - a * 0.15
        # Avoid an unrealistically tiny or huge stop. The structure is preferred
        # when it lives inside the professional ATR envelope.
        raw_distance = price - structural_sl
        risk = min(max(raw_distance, a * 0.70), a * 1.80)
        sl = price - risk
        tps = [entry + risk * x for x in rr_targets]
    else:
        swing_highs = [p.price for p in ps if p.kind == 'HIGH' and p.index >= min_index and p.price > price]
        structural = min(swing_highs) if swing_highs else max(c.high for c in candles[-min(pivot_lookback, len(candles)):])
        structural_sl = structural + a * 0.15
        raw_distance = structural_sl - price
        risk = min(max(raw_distance, a * 0.70), a * 1.80)
        sl = price + risk
        tps = [entry - risk * x for x in rr_targets]

    return {
        'atr': a,
        'entry_low': min(entry_low, entry_high),
        'entry_high': max(entry_low, entry_high),
        'entry': entry,
        'stop_loss': sl,
        'invalidation': sl,
        'take_profits': tps,
        'rr': float(rr_targets[-1]),
        'order_block': None,
        'dynamic': True,
        'plan_source': 'CURRENT_PRICE_ATR_SWING',
    }

def assess_entry_actionability(candles: list[Candle], direction: str, levels: dict) -> dict:
    """Return whether a setup is still actionable at the *current* market price.

    Prevents stale/late alerts where price has already left the entry zone or hit TP1.
    """
    if not candles or not levels or direction not in {'LONG','SHORT'}:
        return {'status':'UNAVAILABLE','action':'NO TRADE','distance_atr':None,'current_price':candles[-1].close if candles else None}
    price=float(candles[-1].close)
    a=float(levels.get('atr') or 0)
    lo=float(levels.get('entry_low'))
    hi=float(levels.get('entry_high'))
    sl=float(levels.get('stop_loss'))
    tps=[float(x) for x in (levels.get('take_profits') or [])]
    if a <= 0:
        return {'status':'UNAVAILABLE','action':'NO TRADE','distance_atr':None,'current_price':price}

    block=levels.get('order_block') or {}
    block_index=block.get('index') if isinstance(block,dict) else None
    since_setup=candles[(int(block_index)+1):] if isinstance(block_index,int) and 0 <= block_index < len(candles)-1 else []
    # Freshness guard: an old zone may still be mathematically valid, but it must not
    # be advertised as a new live signal hours/days later. 12 bars keeps the setup
    # tied to the current market context across all supported timeframes.
    if isinstance(block_index,int):
        age_bars=max(0,(len(candles)-1)-block_index)
        if age_bars > 12:
            return {'status':'STALE_SETUP','action':'NO TRADE — setup is no longer fresh','distance_atr':None,'current_price':price,'setup_age_bars':age_bars}

    if direction=='LONG':
        if price <= sl:
            return {'status':'INVALIDATED','action':'NO TRADE — setup invalidated','distance_atr':None,'current_price':price}
        tp_was_touched=bool(tps and since_setup and any(c.high >= tps[0] for c in since_setup))
        if (tps and price >= tps[0]) or tp_was_touched:
            return {'status':'TP_ALREADY_REACHED','action':'NO TRADE — TP1 already reached','distance_atr':round((price-hi)/a,3),'current_price':price}
        if lo <= price <= hi:
            return {'status':'IN_ENTRY','action':'ENTRY ACTIVE','distance_atr':0.0,'current_price':price}
        if price > hi:
            d=(price-hi)/a
            if d <= 0.20:
                return {'status':'NEAR_ENTRY','action':'ENTRY STILL ACCEPTABLE','distance_atr':round(d,3),'current_price':price}
            return {'status':'MISSED','action':'NO TRADE — price already extended','distance_atr':round(d,3),'current_price':price}
        d=(lo-price)/a
        return {'status':'WAIT_ENTRY','action':'WAIT FOR PRICE TO REACH ENTRY','distance_atr':round(d,3),'current_price':price}

    if price >= sl:
        return {'status':'INVALIDATED','action':'NO TRADE — setup invalidated','distance_atr':None,'current_price':price}
    tp_was_touched=bool(tps and since_setup and any(c.low <= tps[0] for c in since_setup))
    if (tps and price <= tps[0]) or tp_was_touched:
        return {'status':'TP_ALREADY_REACHED','action':'NO TRADE — TP1 already reached','distance_atr':round((lo-price)/a,3),'current_price':price}
    if lo <= price <= hi:
        return {'status':'IN_ENTRY','action':'ENTRY ACTIVE','distance_atr':0.0,'current_price':price}
    if price < lo:
        d=(lo-price)/a
        if d <= 0.20:
            return {'status':'NEAR_ENTRY','action':'ENTRY STILL ACCEPTABLE','distance_atr':round(d,3),'current_price':price}
        return {'status':'MISSED','action':'NO TRADE — price already extended','distance_atr':round(d,3),'current_price':price}
    d=(price-hi)/a
    return {'status':'WAIT_ENTRY','action':'WAIT FOR PRICE TO REACH ENTRY','distance_atr':round(d,3),'current_price':price}


def trade_plan_sanity(direction: str, current_price: float | None, levels: dict, action: str) -> tuple[bool, str]:
    """Validate that a displayed CURRENT plan is geometrically consistent with live price.

    This is a final invariant guard. Historical/stale levels must never leak into the
    Current Signal card. WAIT/BUY/SELL plans must have correctly ordered SL/TP levels.
    """
    if action in {'NO TRADE', 'WAIT FOR CONFIRMATION'}:
        return True, 'No executable plan required'
    if direction not in {'LONG', 'SHORT'} or current_price is None or not levels:
        return False, 'Missing live trade plan'
    try:
        price = float(current_price)
        lo = float(levels['entry_low'])
        hi = float(levels['entry_high'])
        sl = float(levels['stop_loss'])
        tps = [float(x) for x in (levels.get('take_profits') or [])]
    except (KeyError, TypeError, ValueError):
        return False, 'Incomplete live trade plan'
    if lo > hi or len(tps) < 3:
        return False, 'Malformed entry/target structure'
    if direction == 'LONG':
        if not sl < lo:
            return False, 'LONG stop must be below entry'
        if not (tps[0] < tps[1] < tps[2]):
            return False, 'LONG targets must ascend'
        if not all(tp > hi for tp in tps):
            return False, 'LONG targets must be above entry'
        if action == 'BUY NOW' and tps[0] <= price:
            return False, 'LONG TP1 is already behind current price'
        if action == 'WAIT FOR ENTRY' and price >= hi:
            return False, 'LONG wait-entry plan is no longer ahead of price'
    else:
        if not sl > hi:
            return False, 'SHORT stop must be above entry'
        if not (tps[0] > tps[1] > tps[2]):
            return False, 'SHORT targets must descend'
        if not all(tp < lo for tp in tps):
            return False, 'SHORT targets must be below entry'
        if action == 'SELL NOW' and tps[0] >= price:
            return False, 'SHORT TP1 is already behind current price'
        if action == 'WAIT FOR ENTRY' and price <= lo:
            return False, 'SHORT wait-entry plan is no longer ahead of price'
    return True, 'Live trade plan is consistent'
