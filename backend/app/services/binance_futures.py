from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from typing import Any

import httpx
import websockets

from app.core.config import settings
from app.models.candle import Candle

INTERVAL_MAP = {
    '1M': '1m', '5M': '5m', '15M': '15m', '30M': '30m',
    '1H': '1h', '4H': '4h', '1D': '1d',
}

class BinanceFuturesClient:
    def __init__(self) -> None:
        self.rest_base = settings.binance_futures_base.rstrip('/')
        self.ws_base = settings.binance_futures_ws.rstrip('/')
        self._kline_cache: dict[str, tuple[float, list[Candle]]] = {}
        self._live_current: dict[tuple[str,str], Candle] = {}

    @staticmethod
    def normalize_interval(timeframe: str) -> str:
        key = timeframe.upper()
        if key not in INTERVAL_MAP:
            raise ValueError(f'Unsupported timeframe: {timeframe}')
        return INTERVAL_MAP[key]

    @staticmethod
    def _to_candle(row: list[Any]) -> Candle:
        return Candle(
            open_time=int(row[0]),
            close_time=int(row[6]),
            open=float(row[1]), high=float(row[2]), low=float(row[3]), close=float(row[4]),
            volume=float(row[5]), closed=True,
        )

    def _merge_live(self, symbol: str, timeframe: str, rows: list[Candle], limit: int) -> list[Candle]:
        live=self._live_current.get((symbol.upper(), timeframe.upper()))
        if not live:
            return rows[-limit:]
        merged=list(rows)
        if merged and merged[-1].open_time==live.open_time:
            merged[-1]=live.model_copy()
        elif not merged or live.open_time>merged[-1].open_time:
            merged.append(live.model_copy())
        return merged[-limit:]

    async def klines(self, symbol: str, timeframe: str, limit: int = 500) -> list[Candle]:
        interval = self.normalize_interval(timeframe)
        symbol=symbol.upper()
        limit=max(50, min(limit, 1500))
        key=f'{symbol}:{interval}:{limit}'
        params = {'symbol': symbol, 'interval': interval, 'limit': limit}
        last_exc: Exception | None = None

        # Short TTL: analysis/dashboard polling should reuse the same REST snapshot while
        # the current candle itself is kept fresh by WebSocket. This prevents a burst of
        # duplicate Binance REST calls from signal + overlays + health + MTF requests.
        cached=self._kline_cache.get(key)
        if cached and time.monotonic()-cached[0] <= 8:
            return self._merge_live(symbol,timeframe,cached[1],limit)

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    response = await client.get(f'{self.rest_base}/fapi/v1/klines', params=params)
                    response.raise_for_status()
                    rows=[self._to_candle(row) for row in response.json()]
                    self._kline_cache[key]=(time.monotonic(),rows)
                    return self._merge_live(symbol,timeframe,rows,limit)
            except Exception as exc:
                last_exc=exc
                await asyncio.sleep(0.35*(2**attempt))

        # Transient Binance/network failure: keep the UI alive with a recent successful snapshot.
        cached=self._kline_cache.get(key)
        if cached and time.monotonic()-cached[0] <= 120:
            return self._merge_live(symbol,timeframe,cached[1],limit)
        assert last_exc is not None
        raise last_exc

    async def exchange_symbols(self) -> list[str]:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(f'{self.rest_base}/fapi/v1/exchangeInfo')
            response.raise_for_status()
            data = response.json()
        return [
            item['symbol'] for item in data.get('symbols', [])
            if item.get('contractType') == 'PERPETUAL' and item.get('quoteAsset') == 'USDT' and item.get('status') == 'TRADING'
        ]

    async def stream_klines(self, symbol: str, timeframe: str) -> AsyncIterator[Candle]:
        interval = self.normalize_interval(timeframe)
        stream = f'{symbol.lower()}@kline_{interval}'
        url = f'{self.ws_base}/ws/{stream}'
        backoff = 1
        while True:
            try:
                async with websockets.connect(url, ping_interval=150, ping_timeout=30, close_timeout=10) as ws:
                    backoff = 1
                    async for message in ws:
                        import json
                        payload = json.loads(message)
                        k = payload.get('k', {})
                        if not k:
                            continue
                        candle=Candle(
                            open_time=int(k['t']), close_time=int(k['T']),
                            open=float(k['o']), high=float(k['h']), low=float(k['l']), close=float(k['c']),
                            volume=float(k['v']), closed=bool(k['x']),
                        )
                        self._live_current[(symbol.upper(),timeframe.upper())]=candle.model_copy()
                        yield candle
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

binance_futures = BinanceFuturesClient()
