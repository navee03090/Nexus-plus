"""Skip archived notices so crawls keep only current and upcoming opportunities."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import dateutil.parser


def as_aware(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = dateutil.parser.parse(str(value))
        except Exception:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def is_stale_announcement(published_at: Any, lookback_days: int = 60, now: Optional[datetime] = None) -> bool:
    """True when the source post itself is older than the lookback window."""
    pub = as_aware(published_at)
    if not pub:
        return False
    now = now or datetime.now(timezone.utc)
    return pub < now - timedelta(days=lookback_days)


def is_past_opportunity(
    registration_deadline: Any = None,
    start_date: Any = None,
    end_date: Any = None,
    now: Optional[datetime] = None,
) -> bool:
    """True when the event/apply window has already closed."""
    now = now or datetime.now(timezone.utc)
    deadline = as_aware(registration_deadline)
    start = as_aware(start_date)
    end = as_aware(end_date)
    if end and end < now:
        return True
    if start and start < now and (not deadline or deadline < now):
        return True
    if deadline and deadline < now and (not start or start < now):
        return True
    return False
