"""
Key and Model Pool Manager for Multi-Provider AI Inference.
Handles automatic key rotation, rate-limit cooldowns, error tracking, and fair round-robin scheduling.
"""
import time
from typing import List, Dict, Optional, Any
from app.core.logging import logger


class KeyRotator:
    """
    Manages a pool of API keys with intelligent cooldown and failover rotation.
    Ensures that when a key hits rate limits or depleted quotas, traffic shifts immediately
    to alternative healthy keys.
    """

    def __init__(self, provider_name: str, keys: List[str]):
        self.provider_name = provider_name
        self.keys = [k.strip() for k in keys if k and len(k.strip()) > 5]
        self._cooldowns: Dict[str, float] = {}
        self._failures: Dict[str, int] = {}
        self._current_index = 0

    @property
    def has_keys(self) -> bool:
        return len(self.keys) > 0

    @property
    def total_keys(self) -> int:
        return len(self.keys)

    def _mask_key(self, key: str) -> str:
        if len(key) <= 8:
            return "***"
        return f"{key[:6]}...{key[-4:]}"

    def get_candidate_keys(self) -> List[str]:
        """
        Returns keys prioritized by health.
        Healthy keys (not in cooldown) are yielded first, starting from the current rotating offset.
        Keys currently in cooldown are placed at the end as a last resort.
        """
        if not self.keys:
            return []

        now = time.time()
        healthy: List[str] = []
        cooling: List[str] = []

        n = len(self.keys)
        # Scan starting from current rotating index to distribute traffic
        for i in range(n):
            k = self.keys[(self._current_index + i) % n]
            cd = self._cooldowns.get(k, 0.0)
            if now >= cd:
                healthy.append(k)
            else:
                cooling.append(k)

        return healthy + cooling

    def mark_rate_limited(self, key: str, cooldown_seconds: float = 60.0, reason: str = "Rate limit / Quota depleted"):
        """Marks a key as rate-limited, engaging an automatic cooldown period."""
        now = time.time()
        self._cooldowns[key] = now + cooldown_seconds
        self._failures[key] = self._failures.get(key, 0) + 1
        masked = self._mask_key(key)
        logger.warning(
            f"[{self.provider_name}] Key {masked} hit limit ({reason}). "
            f"Placing on cooldown for {int(cooldown_seconds)}s. Rotating to next key..."
        )
        self._advance_index()

    def mark_error(self, key: str, cooldown_seconds: float = 15.0, error_msg: str = ""):
        """Marks a key for temporary cooldown upon server or connectivity errors."""
        now = time.time()
        self._cooldowns[key] = now + cooldown_seconds
        self._failures[key] = self._failures.get(key, 0) + 1
        masked = self._mask_key(key)
        logger.warning(
            f"[{self.provider_name}] Key {masked} encountered error ({error_msg}). "
            f"Cooling down for {int(cooldown_seconds)}s."
        )
        self._advance_index()

    def mark_success(self, key: str):
        """Acknowledges a successful request on the given key."""
        self._cooldowns.pop(key, None)
        self._failures[key] = 0
        self._advance_index()

    def _advance_index(self):
        if self.keys:
            self._current_index = (self._current_index + 1) % len(self.keys)

    def get_status_diagnostics(self) -> Dict[str, Any]:
        """Returns diagnostic metadata about healthy vs cooling keys."""
        now = time.time()
        healthy_count = sum(1 for k in self.keys if now >= self._cooldowns.get(k, 0.0))
        return {
            "total_keys": len(self.keys),
            "healthy_keys": healthy_count,
            "cooling_keys": len(self.keys) - healthy_count,
        }
