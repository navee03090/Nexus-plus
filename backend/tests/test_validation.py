"""
Unit tests for Deterministic Validation Engine (Section 34).
"""
from app.schemas.opportunity import GeminiExtractionOutput
from app.services.extraction.validator import DeterministicValidator


def test_valid_extraction():
    output = GeminiExtractionOutput(
        is_opportunity=True,
        title="AI Hackathon 2026",
        summary="A competitive hackathon at UET Peshawar.",
        description="Full description text.",
        category="Hackathon",
        start_date="2026-10-24T09:00:00",
        registration_deadline="2026-10-18T23:59:59",
        registration_url="https://kpitb.gov.pk/register",
        contact_email="hackathon@uetpeshawar.edu.pk",
        confidence_score=0.95
    )
    res = DeterministicValidator.validate(output)
    assert res.is_valid is True
    assert res.status == "valid"
    assert len(res.warnings) == 0


def test_temporal_contradiction_detection():
    # Deadline is after start date!
    output = GeminiExtractionOutput(
        is_opportunity=True,
        title="Conference 2026",
        category="Conference",
        start_date="2026-10-15T09:00:00",
        registration_deadline="2026-10-25T23:59:59",  # Contradiction!
        confidence_score=0.88
    )
    res = DeterministicValidator.validate(output)
    assert res.is_valid is True
    assert res.status == "flagged"
    assert any("Temporal contradiction detected" in w for w in res.warnings)


def test_invalid_urls_and_emails_sanitized():
    output = GeminiExtractionOutput(
        is_opportunity=True,
        title="Webinar",
        registration_url="javascript:alert(1)",  # Malicious / invalid URL
        contact_email="not-an-email",
        category="Webinar"
    )
    res = DeterministicValidator.validate(output)
    assert res.status == "flagged"
    assert res.validated_data["registration_url"] is None
    assert res.validated_data["contact_email"] is None


def test_missing_title_rejected():
    output = GeminiExtractionOutput(
        is_opportunity=True,
        title="",  # Empty title
        category="Other"
    )
    res = DeterministicValidator.validate(output)
    assert res.is_valid is False
    assert res.status == "invalid"
