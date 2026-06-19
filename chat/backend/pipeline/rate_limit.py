import asyncio
import time

from ..config import get_settings


class AsyncRateLimiter:
    """Garante intervalo mínimo entre chamadas async sequenciais."""

    def __init__(self, min_interval_s: float = 0.35):
        self.min_interval = min_interval_s
        self._last_call = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait = self._last_call + self.min_interval - now
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = time.monotonic()


# Sem api_key a NCBI limita a 3 req/s (~0.34s); com api_key sobe para 10 req/s.
_interval = 0.11 if get_settings().ncbi_api_key else 0.34
ncbi_limiter = AsyncRateLimiter(min_interval_s=_interval)
