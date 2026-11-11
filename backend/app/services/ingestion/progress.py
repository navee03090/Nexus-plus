"""In-memory step log for one Crawl Now request.

The admin page polls this while the crawl request is still running.
It is display only. A missing record does not change what the crawl saves.
"""
import time
from typing import Any, Dict, Optional


class CrawlProgressStore:
    def __init__(self) -> None:
        self._runs: Dict[str, Dict[str, Any]] = {}

    def begin(self, source_id: str, source_name: str, alias: Optional[str] = None) -> None:
        record = {
            "source_id": source_id,
            "source_name": source_name,
            "status": "running",
            "current": "Starting",
            "steps": [],
            "_open_label": None,
            "_opened_at": None,
        }
        self._runs[source_id] = record
        if alias and alias != source_id:
            self._runs[alias] = record

    def pulse(self, source_id: str, label: str) -> None:
        record = self._runs.get(source_id)
        if not record:
            return
        self._close_open(record)
        record["_open_label"] = label
        record["_opened_at"] = time.monotonic()
        record["current"] = label

    def complete_open(self, source_id: str, label: str) -> None:
        record = self._runs.get(source_id)
        if not record:
            return
        if record.get("_open_label"):
            record["_open_label"] = label
            self._close_open(record)
            record["current"] = label
            return
        record["steps"].append({"label": label, "seconds": 0, "state": "done"})
        record["current"] = label

    def attach(self, source_id: str, result: Dict[str, Any]) -> None:
        record = self._runs.get(source_id)
        if not record:
            return
        record["result"] = result

    def finish(self, source_id: str, status: str = "success") -> None:
        record = self._runs.get(source_id)
        if not record:
            return
        if record.get("_open_label"):
            self._close_open(record)
        record["status"] = status
        record["current"] = "Finished" if status == "success" else "Stopped"

    def snapshot(self, source_id: str) -> Optional[Dict[str, Any]]:
        record = self._runs.get(source_id)
        if not record:
            return None
        steps = [dict(step) for step in record["steps"]]
        if record.get("_open_label") and record.get("_opened_at") is not None:
            steps.append({
                "label": record["_open_label"],
                "seconds": round(time.monotonic() - record["_opened_at"], 1),
                "state": "active",
            })
        return {
            "source_id": record["source_id"],
            "source_name": record["source_name"],
            "status": record["status"],
            "current": record["current"],
            "steps": steps,
            "result": record.get("result"),
        }

    def _close_open(self, record: Dict[str, Any]) -> None:
        label = record.get("_open_label")
        opened = record.get("_opened_at")
        if not label or opened is None:
            return
        record["steps"].append({
            "label": label,
            "seconds": round(time.monotonic() - opened, 1),
            "state": "done",
        })
        record["_open_label"] = None
        record["_opened_at"] = None


crawl_progress = CrawlProgressStore()
