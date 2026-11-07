from datetime import datetime, timedelta, timezone
from app.services.opportunities.recency import is_past_opportunity, is_stale_announcement

NOW = datetime(2026, 11, 7, 12, 0, tzinfo=timezone.utc)


def test_old_notice_is_stale():
    old = NOW - timedelta(days=90)
    assert is_stale_announcement(old, lookback_days=60, now=NOW) is True


def test_recent_notice_is_kept():
    recent = NOW - timedelta(days=10)
    assert is_stale_announcement(recent, lookback_days=60, now=NOW) is False


def test_past_deadline_without_future_start_is_dropped():
    assert is_past_opportunity(
        registration_deadline=NOW - timedelta(days=3),
        start_date=NOW - timedelta(days=1),
        now=NOW,
    ) is True


def test_future_deadline_is_kept():
    assert is_past_opportunity(
        registration_deadline=NOW + timedelta(days=12),
        start_date=NOW + timedelta(days=20),
        now=NOW,
    ) is False
