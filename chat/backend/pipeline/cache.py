import asyncio
import time
from typing import Any, Optional


class TTLCache:
    """Cache em memória async-safe com TTL fixo por entrada."""

    def __init__(self, ttl_seconds: int = 24 * 3600):
        self.ttl = ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                self._store.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            self._store[key] = (value, time.monotonic() + self.ttl)


ncbi_cache = TTLCache(ttl_seconds=24 * 3600)
