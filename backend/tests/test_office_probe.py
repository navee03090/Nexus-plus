"""Office-model status labels for the admin Overview page."""
from app.services.ai.local_provider import classify_office_probe


def test_live_when_the_configured_model_answers():
    status = classify_office_probe(
        {"success": True, "latency_ms": 420, "available_models": ["qwen2.5:3b", "qwen3:1.7b"]},
        "qwen2.5:3b",
    )
    assert status["state"] == "live"
    assert status["label"] == "Office model live"
    assert status["latency_ms"] == 420


def test_offline_when_the_office_computer_does_not_answer():
    status = classify_office_probe(
        {"success": False, "error": "All connection attempts failed"},
        "qwen2.5:3b",
    )
    assert status["state"] == "offline"
    assert status["label"] == "Office computer off"


def test_token_refused_when_the_computer_answers_401():
    status = classify_office_probe(
        {"success": False, "status_code": 401, "latency_ms": 90},
        "qwen2.5:3b",
    )
    assert status["state"] == "token_refused"
    assert status["label"] == "Computer reachable, token refused"


def test_model_missing_when_another_model_is_loaded():
    status = classify_office_probe(
        {"success": True, "available_models": ["qwen3:0.6b"], "latency_ms": 50},
        "qwen2.5:3b",
    )
    assert status["state"] == "model_down"
    assert "qwen2.5:3b" in status["detail"]
