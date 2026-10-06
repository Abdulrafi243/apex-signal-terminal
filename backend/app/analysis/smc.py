from __future__ import annotations
from app.models.candle import Candle
from app.analysis.market_structure import pivots
from app.analysis.trade_setup import displacement, enrich_blocks, premium_discount
from app.analysis.liquidity_advanced import liquidity_pools, inverse_fvgs
from app.analysis.context import previous_extremes, session_context, level_sweeps


def fair_value_gaps(candles: list[Candle], min_gap_pct: float = 0.00015) -> list[dict]:
    gaps: list[dict] = []
    for i in range(2, len(candles)):
        a, c = candles[i-2], candles[i]
        if c.low > a.high:
            size = (c.low - a.high) / max(a.high, 1e-9)
            if size >= min_gap_pct:
                gaps.append({'type': 'BULLISH_FVG', 'index': i, 'low': a.high, 'high': c.low, 'size_pct': size * 100})
        elif c.high < a.low:
            size = (a.low - c.high) / max(a.low, 1e-9)
            if size >= min_gap_pct:
                gaps.append({'type': 'BEARISH_FVG', 'index': i, 'low': c.high, 'high': a.low, 'size_pct': size * 100})
    return gaps


def structure(candles: list[Candle]) -> dict:
    ps = pivots(candles)
    highs = [p for p in ps if p.kind == 'HIGH']
    lows = [p for p in ps if p.kind == 'LOW']
    if len(highs) < 2 or len(lows) < 2:
        return {'bias': 'NEUTRAL', 'event': 'NONE', 'pivots': ps}
    h1, h2 = highs[-2], highs[-1]; l1, l2 = lows[-2], lows[-1]
    bullish = h2.price > h1.price and l2.price > l1.price
    bearish = h2.price < h1.price and l2.price < l1.price
    bias = 'BULLISH' if bullish else 'BEARISH' if bearish else 'RANGE'
    last = candles[-1]; event='NONE'
    if last.close > h2.price: event = 'BULLISH_BOS' if bullish else 'BULLISH_CHOCH'
    elif last.close < l2.price: event = 'BEARISH_BOS' if bearish else 'BEARISH_CHOCH'
    return {'bias': bias, 'event': event, 'pivots': ps}


def analyze_smc(candles: list[Candle]) -> dict:
    st=structure(candles)
    gaps=fair_value_gaps(candles)
    active=[g for g in gaps[-16:] if not _gap_filled(g,candles[g['index']+1:])]
    pools=liquidity_pools(candles)
    ext=previous_extremes(candles)
    blocks=enrich_blocks(candles)
    quality=setup_quality(candles,active[-6:],blocks)
    return {
        'bias':st['bias'],'structure_event':st['event'],
        'liquidity':pools,
        'active_fvgs':active[-6:],
        'inverse_fvgs':inverse_fvgs(candles,gaps),
        'order_blocks':blocks,
        'setup_quality':quality,
        'displacement':displacement(candles),
        'premium_discount':premium_discount(candles),
        'previous_extremes':ext,
        'previous_level_sweeps':level_sweeps(candles,ext),
        'session':session_context(candles),
        'pivot_count':len(st['pivots']),
    }


def _gap_filled(gap: dict, later: list[Candle]) -> bool:
    if gap['type']=='BULLISH_FVG': return any(c.low <= gap['low'] for c in later)
    return any(c.high >= gap['high'] for c in later)

def setup_quality(candles: list[Candle], active_fvgs: list[dict], blocks: list[dict]) -> dict:
    """Confluence-quality metadata; deterministic and intentionally conservative."""
    from app.analysis.trade_setup import atr
    a=atr(candles)
    last=candles[-1].close
    recent_ranges=[c.high-c.low for c in candles[-30:]]
    avg_range=sum(recent_ranges[:-1])/max(len(recent_ranges)-1,1) if len(recent_ranges)>1 else 0
    current_range=recent_ranges[-1] if recent_ranges else 0
    volatility='EXPANDING' if avg_range and current_range>avg_range*1.5 else 'COMPRESSED' if avg_range and current_range<avg_range*0.65 else 'NORMAL'
    overlaps=[]
    for g in active_fvgs:
        for b in blocks:
            if b.get('state')=='BREAKER': continue
            lo=max(g['low'],b['low']); hi=min(g['high'],b['high'])
            if lo<=hi:
                overlaps.append({'fvg_type':g['type'],'ob_type':b['type'],'low':lo,'high':hi,'ob_state':b.get('state')})
    nearest_gap=min(active_fvgs,key=lambda g:min(abs(last-g['low']),abs(last-g['high']))) if active_fvgs else None
    gap_atr_ratio=((nearest_gap['high']-nearest_gap['low'])/a) if nearest_gap and a>0 else 0
    return {'volatility_regime':volatility,'fvg_ob_overlaps':overlaps[-5:],'nearest_fvg_atr_ratio':round(gap_atr_ratio,3),'atr':a}
