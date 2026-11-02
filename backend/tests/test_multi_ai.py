"""
Unit and integration tests for Multi-AI provider architecture,
key rotation, model fallback, and auto-failover (Gemini <-> Groq).
"""
import pytest
from unittest.mock import MagicMock, patch
from app.services.ai.key_pool import KeyRotator
from app.services.ai.gemini import GeminiProvider
from app.services.ai.groq_provider import GroqProvider
from app.services.ai.multi import MultiAIProvider
from app.schemas.opportunity import GeminiExtractionOutput
from app.core.config import settings


def test_key_rotator_rotation_and_cooldown():
    """Verify that KeyRotator cycles through keys and prioritizes healthy keys over rate-limited ones."""
    keys = ["key-alpha", "key-beta", "key-gamma"]
    rotator = KeyRotator("TestProvider", keys)

    # Initially all keys are healthy
    assert rotator.total_keys == 3
    initial_candidates = rotator.get_candidate_keys()
    assert initial_candidates[0] == "key-alpha"

    # Mark key-alpha as rate-limited with 60s cooldown
    rotator.mark_rate_limited("key-alpha", cooldown_seconds=60.0)

    # Next call should prioritize healthy keys (key-beta, key-gamma) and push key-alpha to the end
    candidates_after_limit = rotator.get_candidate_keys()
    assert candidates_after_limit[0] == "key-beta"
    assert candidates_after_limit[1] == "key-gamma"
    assert candidates_after_limit[2] == "key-alpha"

    diag = rotator.get_status_diagnostics()
    assert diag["healthy_keys"] == 2
    assert diag["cooling_keys"] == 1


@pytest.mark.asyncio
async def test_gemini_key_rotation_on_rate_limit():
    """Verify GeminiProvider automatically moves to the next key when 429/402 is raised."""
    provider = GeminiProvider(
        api_keys=["gemini-key-1-exhausted", "gemini-key-2-working"],
        models=["gemini-3.8-flash"]
    )

    call_history = []

    def mock_generate_content(model, contents, config):
        # Inspect which key was used via current call
        pass

    mock_response = MagicMock()
    mock_response.text = '{"is_opportunity": true, "title": "AI Summit Peshawar", "category": "Conference"}'

    with patch("google.genai.Client") as mock_client_cls:
        def client_side_effect(api_key):
            client_mock = MagicMock()
            if api_key == "gemini-key-1-exhausted":
                client_mock.models.generate_content.side_effect = Exception("402 RESOURCE_EXHAUSTED: credits depleted")
            else:
                client_mock.models.generate_content.return_value = mock_response
            call_history.append(api_key)
            return client_mock

        mock_client_cls.side_effect = client_side_effect

        result = await provider.extract_opportunity(
            raw_text="Join AI Summit Peshawar on 25 October 2026 at UET Peshawar."
        )

        assert isinstance(result, GeminiExtractionOutput)
        assert result.title == "AI Summit Peshawar"
        assert "gemini-key-1-exhausted" in call_history
        assert "gemini-key-2-working" in call_history
        assert provider.last_used_key_prefix == "gemini-key"


@pytest.mark.asyncio
async def test_gemini_model_fallback_on_503():
    """Verify GeminiProvider falls back to next model when 503 unavailable occurs."""
    provider = GeminiProvider(
        api_keys=["gemini-key-valid-123456789"],
        models=["gemini-3.8-flash", "gemini-3.6-flash"]
    )

    models_called = []
    mock_response = MagicMock()
    mock_response.text = '{"is_opportunity": true, "title": "Cybersecurity Workshop", "category": "Workshop"}'

    with patch("google.genai.Client") as mock_client_cls:
        client_mock = MagicMock()

        def generate_content_side_effect(model, contents, config):
            models_called.append(model)
            if model == "gemini-3.8-flash":
                raise Exception("503 UNAVAILABLE: high demand")
            return mock_response

        client_mock.models.generate_content.side_effect = generate_content_side_effect
        mock_client_cls.return_value = client_mock

        result = await provider.extract_opportunity(raw_text="Cybersecurity Workshop at UET Peshawar")
        assert result.title == "Cybersecurity Workshop"
        assert models_called == ["gemini-3.8-flash", "gemini-3.6-flash"]
        assert provider.last_used_model == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_groq_key_rotation_and_extraction():
    """Verify GroqProvider key rotation and extraction."""
    provider = GroqProvider(
        api_keys=["gsk-key-1-ratelimited", "gsk-key-2-working"],
        models=["openai/gpt-oss-120b"]
    )

    keys_called = []
    mock_choice = MagicMock()
    mock_choice.message.content = '{"is_opportunity": true, "title": "National Hackathon", "category": "Hackathon"}'
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch("groq.Groq") as mock_groq_cls:
        def groq_side_effect(api_key, timeout=25.0):
            client = MagicMock()
            keys_called.append(api_key)
            if api_key == "gsk-key-1-ratelimited":
                client.chat.completions.create.side_effect = Exception("429 rate_limit_exceeded: Rate limit reached")
            else:
                client.chat.completions.create.return_value = mock_completion
            return client

        mock_groq_cls.side_effect = groq_side_effect

        result = await provider.extract_opportunity(raw_text="National Hackathon on 20 Oct 2026")
        assert isinstance(result, GeminiExtractionOutput)
        assert result.title == "National Hackathon"
        assert keys_called == ["gsk-key-1-ratelimited", "gsk-key-2-working"]


@pytest.mark.asyncio
async def test_multi_provider_auto_failover_gemini_to_groq():
    """Verify that in auto mode, when all Gemini keys fail, MultiAIProvider seamlessly fails over to Groq."""
    mock_gemini = MagicMock(spec=GeminiProvider)
    mock_gemini.has_valid_api_key = True
    mock_gemini.extract_opportunity.side_effect = RuntimeError("All Gemini keys exhausted")

    mock_groq = MagicMock(spec=GroqProvider)
    mock_groq.has_valid_api_key = True
    mock_groq.model_name = "openai/gpt-oss-120b"
    groq_output = GeminiExtractionOutput(
        is_opportunity=True,
        title="Failover Opportunity",
        category="Competition"
    )
    mock_groq.extract_opportunity.return_value = groq_output

    multi = MultiAIProvider(
        provider_preference="auto",
        gemini_provider=mock_gemini,
        groq_provider=mock_groq
    )

    result = await multi.extract_opportunity(raw_text="Hackathon in KP")
    assert result.title == "Failover Opportunity"
    assert multi.active_provider == "groq"
    assert multi.model_name == "openai/gpt-oss-120b"


@pytest.mark.asyncio
async def test_multi_provider_ultimate_deterministic_fallback():
    """Verify that if both Gemini and Groq fail, high-fidelity deterministic extraction is engaged."""
    mock_gemini = MagicMock(spec=GeminiProvider)
    mock_gemini.has_valid_api_key = True
    mock_gemini.extract_opportunity.side_effect = RuntimeError("All Gemini keys exhausted")
    mock_gemini._fallback_deterministic_extraction.return_value = GeminiExtractionOutput(
        is_opportunity=True,
        title="Deterministic Fallback Opp",
        category="Hackathon"
    )

    mock_groq = MagicMock(spec=GroqProvider)
    mock_groq.has_valid_api_key = True
    mock_groq.extract_opportunity.side_effect = RuntimeError("All Groq keys exhausted")

    multi = MultiAIProvider(
        provider_preference="auto",
        gemini_provider=mock_gemini,
        groq_provider=mock_groq
    )

    result = await multi.extract_opportunity(raw_text="AI Hackathon at UET Peshawar")
    assert result.title == "Deterministic Fallback Opp"
    assert multi.active_provider == "deterministic_fallback"
