"""
Opportunity Verification & Trust Evaluation (Section 35 & 36).
Evaluates whether an extracted opportunity qualifies for automatic publishing
or requires human admin verification.
"""
from typing import Tuple
from app.algorithms.scoring import calculate_composite_trust_score
from app.services.extraction.validator import ValidationResult


class OpportunityVerifier:
    """Calculates overall trust and routes to auto-publish or human review queue."""

    AUTO_PUBLISH_TRUST_THRESHOLD = 0.75

    @classmethod
    def evaluate(
        cls,
        source_trust: float,
        ai_confidence: float,
        validation_result: ValidationResult,
        cross_source_count: int = 1
    ) -> Tuple[float, str, str, bool]:
        """
        Returns:
        (composite_trust_score, verification_status, lifecycle_status, requires_human_review)
        """
        data = validation_result.validated_data
        title = (data.get("title") or "").strip()
        has_url = bool(data.get("registration_url") or data.get("application_url"))
        has_dates = bool(data.get("start_date") or data.get("registration_deadline"))

        trust_score = calculate_composite_trust_score(
            ai_confidence=ai_confidence,
            source_trust=source_trust,
            has_valid_url=has_url,
            has_valid_dates=has_dates,
            cross_source_count=cross_source_count,
        )

        requires_review = False
        review_reason = ""

        # Check conditions requiring human review
        if validation_result.status == "invalid":
            requires_review = True
            review_reason = "Extraction failed validation: " + "; ".join(validation_result.warnings)
        elif len(title) < 8:
            requires_review = True
            review_reason = "Title too short or missing for auto-publish"
        elif not has_url and not has_dates:
            requires_review = True
            review_reason = "Missing apply URL and dates — send to verification queue"
        elif validation_result.status == "flagged":
            requires_review = True
            review_reason = "Deterministic validation warnings: " + "; ".join(validation_result.warnings)
        elif trust_score < cls.AUTO_PUBLISH_TRUST_THRESHOLD:
            requires_review = True
            review_reason = f"Trust score ({trust_score:.2f}) below auto-publish threshold ({cls.AUTO_PUBLISH_TRUST_THRESHOLD})"
        elif source_trust < 0.60:
            requires_review = True
            review_reason = "Unverified third-party source"

        if requires_review:
            verification_status = "unverified"
            lifecycle_status = "pending_review"
        else:
            verification_status = "source_verified" if source_trust >= 0.90 else "ai_verified"
            lifecycle_status = "published"

        return trust_score, verification_status, lifecycle_status, requires_review
