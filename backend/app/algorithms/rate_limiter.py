"""
Per-source rate limiting and exponential backoff.
Respects crawl delays and protects websites from aggressive requests.
"""
import time
import asyncio
from typing import Dict
from app.core.logging import logger

# In-memory sliding window fallback when standalone Redis is absent
_last_request_times: Dict[str, float] = {}
_retry_counts: Dict[str, int] = {}

BACKOFF_SCHEDULE_SECONDS = [10, 30, 120, 600]  # 10s, 30s, 2min, 10min


class SourceRateLimiter:
    """
    Ensures crawl requests respect minimum delay intervals per domain/source.
    """

    @classmethod
    async def acquire_slot(cls, source_id: str, min_delay_seconds: float = 1.0) -> None:
        """Enforces minimum crawl delay per source."""
        now = time.time()
        last_time = _last_request_times.get(source_id, 0.0)
        elapsed = now - last_time

        if elapsed < min_delay_seconds:
            wait_time = min_delay_seconds - elapsed
            logger.debug(f"Rate limiter: Pausing {wait_time:.2f}s for source {source_id}")
            await asyncio.sleep(wait_time)

        _last_request_times[source_id] = time.time()

    @classmethod
    def record_failure(cls, source_id: str) -> int:
        """Increments consecutive failure count and returns recommended backoff seconds."""
        count = _retry_counts.get(source_id, 0) + 1
        _retry_counts[source_id] = count

        schedule_idx = min(count - 1, len(BACKOFF_SCHEDULE_SECONDS) - 1)
        backoff_sec = BACKOFF_SCHEDULE_SECONDS[schedule_idx]
        logger.warning(f"Source {source_id} failed {count} times. Backoff: {backoff_sec}s")
        return backoff_sec

    @classmethod
    def record_success(cls, source_id: str) -> None:
        """Resets failure count after a successful crawl."""
        _retry_counts[source_id] = 0
