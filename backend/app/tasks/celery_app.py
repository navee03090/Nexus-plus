"""
Celery Task Application Configuration (Section 23).
Configures worker queues and Beat schedules.
"""
from celery import Celery
from app.core.config import settings

celery = Celery(
    "nexus_pulse_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.DEFAULT_TIMEZONE,
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 min hard limit
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
)

# Celery Beat recurring schedule
celery.conf.beat_schedule = {
    "recurring_source_health_check": {
        "task": "app.tasks.ingestion.source_health_check_task",
        "schedule": 3600.0,  # every hour
    },
    "recurring_deadline_reminders": {
        "task": "app.tasks.notifications.check_deadline_reminders_task",
        "schedule": 1800.0,  # every 30 mins
    },
}
