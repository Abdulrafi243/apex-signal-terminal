from __future__ import annotations
from dataclasses import dataclass
from app.models.candle import Candle

@dataclass
class Pivot:
    index: int
    price: float
    kind: str  # HIGH | LOW


def pivots(candles: list[Candle], left: int = 2, right: int = 2) -> list[Pivot]:
    out: list[Pivot] = []
    for i in range(left, len(candles) - right):
        c = candles[i]
        window = candles[i-left:i+right+1]
        if c.high == max(x.high for x in window):
            out.append(Pivot(i, c.high, 'HIGH'))
        if c.low == min(x.low for x in window):
            out.append(Pivot(i, c.low, 'LOW'))
    return out
