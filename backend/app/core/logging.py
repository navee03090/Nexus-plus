"""
Structured logging configuration for NEXUS PULSE.
Provides context-aware logging with request_id, task_id, and source_id.
"""
import logging
import sys
from contextvars import ContextVar
from typing import Optional

request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
task_id_ctx: ContextVar[Optional[str]] = ContextVar("task_id", default=None)
source_id_ctx: ContextVar[Optional[str]] = ContextVar("source_id", default=None)
opportunity_id_ctx: ContextVar[Optional[str]] = ContextVar("opportunity_id", default=None)


class ContextLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        record.request_id = request_id_ctx.get() or "-"
        record.task_id = task_id_ctx.get() or "-"
        record.source_id = source_id_ctx.get() or "-"
        record.opportunity_id = opportunity_id_ctx.get() or "-"
        return super().format(record)


def setup_logging(debug: bool = False) -> logging.Logger:
    level = logging.DEBUG if debug else logging.INFO
    formatter = ContextLogFormatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] [req:%(request_id)s task:%(task_id)s src:%(source_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers = [handler]

    # Quiet overly chatty libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    return logging.getLogger("nexus_pulse")


logger = setup_logging()
