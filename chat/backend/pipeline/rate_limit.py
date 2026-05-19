import asyncio
import time


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


ncbi_limiter = AsyncRateLimiter(min_interval_s=0.35)
