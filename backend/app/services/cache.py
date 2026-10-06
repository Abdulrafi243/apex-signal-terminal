from __future__ import annotations
import asyncio, time
from typing import Any, Awaitable, Callable

class AsyncTTLCache:
    def __init__(self):
        self._items: dict[str, tuple[float, Any]] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    def get(self, key: str):
        item = self._items.get(key)
        if not item: return None
        expiry, value = item
        if expiry <= time.monotonic():
            self._items.pop(key, None); return None
        return value

    async def get_or_set(self, key: str, ttl: float, factory: Callable[[], Awaitable[Any]]):
        cached = self.get(key)
        if cached is not None: return cached
        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            cached = self.get(key)
            if cached is not None: return cached
            value = await factory()
            self._items[key] = (time.monotonic()+ttl, value)
            return value

cache = AsyncTTLCache()
