from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
import websockets

from app.core.config import settings
from app.models.candle import Candle

TF_MAP = {'1M':'1min','5M':'5min','15M':'15min','30M':'30min','1H':'1h','4H':'4h','1D':'1day'}
TF_SECONDS = {'1M':60,'5M':300,'15M':900,'30M':1800,'1H':3600,'4H':14400,'1D':86400}
SYMBOL_MAP = {'XAUUSD':'XAU/USD','BTCUSD':'BTC/USD'}


class ForexRateLimited(RuntimeError):
    pass


@dataclass
class _CacheEntry:
    rows: list[Candle]
    fetched_at: float


class ForexProvider:
    def __init__(self) -> None:
        self._cache: dict[tuple[str, str], _CacheEntry] = {}
        self._rate_limited_until: float = 0.0
        self._last_error: str | None = None
        self._last_success_at: float | None = None
        self._backoff_seconds: int = 30
        self._live_current: dict[tuple[str,str], Candle] = {}

    @property
    def configured(self) -> bool:
        return settings.forex_data_provider.lower() == 'twelvedata' and bool(settings.twelve_data_api_key)

    def _symbol(self, symbol: str) -> str:
        s = symbol.upper().replace('/', '')
        if s not in SYMBOL_MAP:
            raise ValueError(f'Unsupported Forex symbol: {symbol}')
        return SYMBOL_MAP[s]

    def _cache_ttl(self, timeframe: str) -> int:
        # Historical candles do not need to be refetched every UI poll.
        # Keep a minimum TTL to protect the Twelve Data quota.
        step = TF_SECONDS.get(timeframe.upper(), 900)
        return max(60, min(step // 2, 300))

    def _cached(self, symbol: str, timeframe: str, limit: int, allow_stale: bool = True) -> list[Candle] | None:
        key = (symbol.upper().replace('/', ''), timeframe.upper())
        entry = self._cache.get(key)
        if not entry:
            return None
        age = time.time() - entry.fetched_at
        if age <= self._cache_ttl(timeframe) or allow_stale:
            return entry.rows[-limit:]
        return None

    def _cache_is_fresh(self, symbol: str, timeframe: str) -> bool:
        key = (symbol.upper().replace('/', ''), timeframe.upper())
        entry = self._cache.get(key)
        return bool(entry and (time.time() - entry.fetched_at) <= self._cache_ttl(timeframe))

    def _merge_live(self, symbol: str, timeframe: str, rows: list[Candle], limit: int) -> list[Candle]:
        live=self._live_current.get((symbol.upper().replace('/', ''), timeframe.upper()))
        if not live:
            return rows[-limit:]
        merged=list(rows)
        if merged and merged[-1].open_time == live.open_time:
            merged[-1]=live.model_copy()
        elif not merged or live.open_time > merged[-1].open_time:
            merged.append(live.model_copy())
        return merged[-limit:]

    def status(self) -> dict:
        now = time.time()
        rate_limited = now < self._rate_limited_until
        return {
            'provider': settings.forex_data_provider,
            'configured': self.configured,
            'symbols': list(SYMBOL_MAP),
            'live_data': self.configured,
            'rest_base': settings.twelve_data_base if settings.forex_data_provider.lower() == 'twelvedata' else None,
            'state': 'RATE_LIMITED' if rate_limited else ('READY' if self.configured else 'NOT_CONFIGURED'),
            'retry_in_seconds': max(0, int(self._rate_limited_until - now)) if rate_limited else 0,
            'last_success_at': self._last_success_at,
            'last_error': self._last_error,
            'cache_entries': len(self._cache),
            'message': (
                'Forex feed is temporarily rate limited. Cached candles are used when available.'
                if rate_limited else
                ('Twelve Data is configured for XAU/USD and BTC/USD.' if self.configured else
                 'Set FOREX_DATA_PROVIDER=twelvedata and TWELVE_DATA_API_KEY. Until then Forex stays NOT_CONFIGURED.')
            ),
        }

    async def klines(self, symbol: str, timeframe: str = '15M', limit: int = 300) -> list[Candle]:
        if not self.configured:
            raise RuntimeError('Forex provider not configured')

        tf = timeframe.upper()
        if tf not in TF_MAP:
            raise ValueError(f'Unsupported timeframe: {timeframe}')

        normalized = symbol.upper().replace('/', '')
        key = (normalized, tf)

        # Use fresh cache first. This prevents repeated /time_series calls from the
        # chart, overlays, MTF, signal engine, risk/status polling, etc.
        if self._cache_is_fresh(normalized, tf):
            cached = self._cached(normalized, tf, limit, allow_stale=True)
            if cached is not None:
                return self._merge_live(normalized, tf, cached, limit)

        # When rate limited, do not keep hammering the provider. Serve stale cache
        # if we have it; otherwise return a short sanitized error.
        if time.time() < self._rate_limited_until:
            cached = self._cached(normalized, tf, limit, allow_stale=True)
            if cached is not None:
                return self._merge_live(normalized, tf, cached, limit)
            raise ForexRateLimited('Forex provider is rate limited; retry shortly')

        params = {
            'symbol': self._symbol(symbol),
            'interval': TF_MAP[tf],
            'outputsize': min(max(limit, 240), 5000),
            'order': 'ASC',
            'timezone': 'UTC',
            'apikey': settings.twelve_data_api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(f"{settings.twelve_data_base.rstrip('/')}/time_series", params=params)

            if r.status_code == 429:
                retry_after = r.headers.get('retry-after')
                try:
                    retry_seconds = max(30, int(float(retry_after))) if retry_after else self._backoff_seconds
                except Exception:
                    retry_seconds = self._backoff_seconds
                self._rate_limited_until = time.time() + min(retry_seconds, 300)
                self._backoff_seconds = min(max(self._backoff_seconds * 2, 60), 300)
                self._last_error = 'RATE_LIMITED'
                cached = self._cached(normalized, tf, limit, allow_stale=True)
                if cached is not None:
                    return cached
                raise ForexRateLimited('Forex provider is rate limited; retry shortly')

            r.raise_for_status()
            payload = r.json()
            if payload.get('status') == 'error':
                message = str(payload.get('message', 'Twelve Data error'))
                if 'limit' in message.lower() or 'credit' in message.lower():
                    self._rate_limited_until = time.time() + self._backoff_seconds
                    self._backoff_seconds = min(self._backoff_seconds * 2, 300)
                    self._last_error = 'RATE_LIMITED'
                    cached = self._cached(normalized, tf, limit, allow_stale=True)
                    if cached is not None:
                        return cached
                    raise ForexRateLimited('Forex provider is rate limited; retry shortly')
                raise RuntimeError('Forex provider returned an error')

            values = payload.get('values') or []
            out: list[Candle] = []
            step = TF_SECONDS[tf]
            for row in values:
                dt = datetime.fromisoformat(str(row['datetime']).replace('Z', '+00:00'))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                ts = int(dt.timestamp())
                out.append(Candle(
                    open_time=ts * 1000,
                    close_time=(ts + step) * 1000 - 1,
                    open=float(row['open']),
                    high=float(row['high']),
                    low=float(row['low']),
                    close=float(row['close']),
                    volume=float(row.get('volume') or 0),
                    closed=True,
                ))

            if out:
                self._cache[key] = _CacheEntry(rows=out, fetched_at=time.time())
                self._last_success_at = time.time()
                self._last_error = None
                self._backoff_seconds = 30
                self._rate_limited_until = 0.0
                return self._merge_live(normalized, tf, out, limit)

            cached = self._cached(normalized, tf, limit, allow_stale=True)
            if cached is not None:
                return self._merge_live(normalized, tf, cached, limit)
            raise RuntimeError('Forex provider returned no candle data')

        except ForexRateLimited:
            raise
        except (httpx.TimeoutException, httpx.TransportError):
            self._last_error = 'NETWORK_DELAY'
            cached = self._cached(normalized, tf, limit, allow_stale=True)
            if cached is not None:
                return self._merge_live(normalized, tf, cached, limit)
            raise RuntimeError('Forex feed temporarily unavailable')
        except httpx.HTTPStatusError:
            self._last_error = 'UPSTREAM_ERROR'
            cached = self._cached(normalized, tf, limit, allow_stale=True)
            if cached is not None:
                return self._merge_live(normalized, tf, cached, limit)
            raise RuntimeError('Forex feed temporarily unavailable')

    async def stream_klines(self, symbol: str, timeframe: str = '15M'):
        if not self.configured:
            raise RuntimeError('Forex provider not configured')
        tf = timeframe.upper()
        step = TF_SECONDS.get(tf)
        if not step:
            raise ValueError(f'Unsupported timeframe: {timeframe}')
        api_symbol = self._symbol(symbol)
        backoff = 1

        while True:
            try:
                seed_rows = await self.klines(symbol, tf, 2)
                if not seed_rows:
                    raise RuntimeError('No Forex seed candle available')
                current = seed_rows[-1].model_copy()
                url = f"{settings.twelve_data_ws}?apikey={settings.twelve_data_api_key}"
                async with websockets.connect(url, ping_interval=20, ping_timeout=20, close_timeout=5) as ws:
                    await ws.send(json.dumps({'action':'subscribe','params':{'symbols':api_symbol}}))
                    backoff = 1
                    while True:
                        raw = await asyncio.wait_for(ws.recv(), timeout=35)
                        msg = json.loads(raw)
                        if msg.get('event') != 'price':
                            continue
                        price = float(msg.get('price'))
                        event_ts = int(float(msg.get('timestamp') or time.time()))
                        bucket = (event_ts // step) * step
                        if current.open_time // 1000 != bucket:
                            current.closed = True
                            self._live_current[(symbol.upper().replace('/',''), tf)] = current.model_copy()
                            yield current
                            current = Candle(
                                open_time=bucket * 1000,
                                close_time=(bucket + step) * 1000 - 1,
                                open=price, high=price, low=price, close=price,
                                volume=0, closed=False,
                            )
                        else:
                            current.high = max(current.high, price)
                            current.low = min(current.low, price)
                            current.close = price
                            current.closed = False
                        self._live_current[(symbol.upper().replace('/',''), tf)] = current.model_copy()
                        # Keep the REST cache synchronized with the live candle so the
                        # signal engine and chart evaluate the same current market.
                        key=(symbol.upper().replace('/',''), tf)
                        cached=self._cache.get(key)
                        if cached:
                            rows=list(cached.rows)
                            if rows and rows[-1].open_time==current.open_time: rows[-1]=current.model_copy()
                            elif not rows or current.open_time>rows[-1].open_time: rows.append(current.model_copy())
                            self._cache[key]=_CacheEntry(rows=rows, fetched_at=cached.fetched_at)
                        yield current.model_copy()
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)


forex_provider = ForexProvider()
