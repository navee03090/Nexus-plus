"""The crawl step log is display-only and keeps each step's time."""
import time

from app.services.ingestion.progress import CrawlProgressStore


def test_crawl_progress_records_steps_and_result():
    store = CrawlProgressStore()
    store.begin("src-1", "PSEB", alias="alias-1")
    store.pulse("src-1", "Reading the website")
    time.sleep(0.01)
    store.complete_open("src-1", "Reading the website — 2 items")
    store.pulse("src-1", "AI model reading: Artificial Intelligence")
    store.complete_open("src-1", "Published: Artificial Intelligence")
    store.attach("src-1", {"items_found": 2, "items_published": 1, "status": "success"})
    store.finish("src-1", "success")

    snap = store.snapshot("alias-1")
    assert snap is not None
    assert snap["status"] == "success"
    assert [step["label"] for step in snap["steps"]] == [
        "Reading the website — 2 items",
        "Published: Artificial Intelligence",
    ]
    assert snap["steps"][0]["seconds"] >= 0
    assert snap["result"]["items_published"] == 1
