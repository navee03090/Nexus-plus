from app.services.extraction.validator import ValidationResult
from app.services.opportunities.verifier import OpportunityVerifier


def _result(data, status="valid"):
    return ValidationResult(is_valid=status != "invalid", status=status, warnings=[], validated_data=data)


def test_incomplete_extract_goes_to_queue():
    trust, verif, life, needs_review = OpportunityVerifier.evaluate(
        source_trust=0.99,
        ai_confidence=0.95,
        validation_result=_result({"title": "Office space available", "registration_url": None, "start_date": None}),
    )
    assert needs_review is True
    assert life == "pending_review"


def test_complete_extract_can_publish():
    trust, verif, life, needs_review = OpportunityVerifier.evaluate(
        source_trust=0.95,
        ai_confidence=0.92,
        validation_result=_result({
            "title": "KPITB Fellowship 2026",
            "registration_url": "https://kpitb.gov.pk/apply",
            "registration_deadline": "2026-12-01",
        }),
    )
    assert needs_review is False
    assert life == "published"
