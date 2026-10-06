from __future__ import annotations
from app.models.candle import Candle
from app.analysis.market_structure import pivots


def liquidity_pools(candles: list[Candle], tolerance_pct: float = 0.0012) -> dict:
    ps = pivots(candles)
    highs = [p for p in ps if p.kind == 'HIGH'][-14:]
    lows = [p for p in ps if p.kind == 'LOW'][-14:]

    def clusters(items):
        used=set(); out=[]
        for i,a in enumerate(items):
            if i in used: continue
            group=[a]
            for j,b in enumerate(items[i+1:], start=i+1):
                avg=(a.price+b.price)/2
                if abs(a.price-b.price)/max(avg,1e-9) <= tolerance_pct:
                    group.append(b); used.add(j)
            if len(group)>=2:
                out.append({'price':sum(x.price for x in group)/len(group),'touches':len(group),'last_index':max(x.index for x in group)})
        return out

    bsl=clusters(highs); ssl=clusters(lows)
    last=candles[-1]
    bsl_sweep=[x for x in bsl if last.high>x['price'] and last.close<x['price']]
    ssl_sweep=[x for x in ssl if last.low<x['price'] and last.close>x['price']]
    return {
        'buy_side_pools':bsl[-5:], 'sell_side_pools':ssl[-5:],
        'buy_side_sweep':bsl_sweep[-1] if bsl_sweep else None,
        'sell_side_sweep':ssl_sweep[-1] if ssl_sweep else None,
    }


def inverse_fvgs(candles: list[Candle], fvgs: list[dict]) -> list[dict]:
    out=[]
    for g in fvgs:
        later=candles[g['index']+1:]
        if g['type']=='BULLISH_FVG':
            broken=next((i for i,c in enumerate(later) if c.close < g['low']), None)
            if broken is not None:
                out.append({**g,'type':'BEARISH_IFVG','broken_after':broken})
        else:
            broken=next((i for i,c in enumerate(later) if c.close > g['high']), None)
            if broken is not None:
                out.append({**g,'type':'BULLISH_IFVG','broken_after':broken})
    return out[-6:]
