"""
Deterministic Validation Engine (Section 34).
Executes rule-based checks on AI extraction output.
Flags contradictions rather than silently corrupting uncertain data.
"""
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import dateutil.parser

from app.schemas.opportunity import GeminiExtractionOutput


class ValidationResult:
    def __init__(self, is_valid: bool, status: str, warnings: List[str], validated_data: Dict[str, Any]):
        self.is_valid = is_valid
        self.status = status  # valid, flagged, invalid
        self.warnings = warnings
        self.validated_data = validated_data


class DeterministicValidator:
    """Deterministic validation rules executed immediately after AI extraction."""

    RECOGNIZED_CATEGORIES = {
        "hackathon", "competition", "workshop", "conference", "seminar",
        "webinar", "training", "certification", "internship", "scholarship",
        "fellowship", "research grant", "call for papers", "startup program",
        "tech summit", "meetup", "networking event", "challenge", "award",
        "student program", "exchange program", "volunteer opportunity", "other"
    }

    @classmethod
    def validate(cls, extraction: GeminiExtractionOutput) -> ValidationResult:
        warnings: List[str] = []
        data = extraction.model_dump()

        # 1. Title verification
        title = data.get("title")
        if not title or len(title.strip()) < 3:
            return ValidationResult(
                is_valid=False,
                status="invalid",
                warnings=["Title is missing or under 3 characters."],
                validated_data=data
            )

        # 2. Category normalization
        category = (data.get("category") or "Other").strip()
        if category.lower() not in cls.RECOGNIZED_CATEGORIES:
            warnings.append(f"Unrecognized category '{category}'. Assigned to 'Other'.")
            data["category"] = "Other"

        # 3. Date validation & contradiction check
        start_dt: Optional[datetime] = None
        deadline_dt: Optional[datetime] = None

        if data.get("start_date"):
            try:
                start_dt = dateutil.parser.parse(str(data["start_date"]))
            except Exception:
                warnings.append(f"Invalid start_date format: {data['start_date']}. Reset to null.")
                data["start_date"] = None

        if data.get("registration_deadline"):
            try:
                deadline_dt = dateutil.parser.parse(str(data["registration_deadline"]))
            except Exception:
                warnings.append(f"Invalid registration_deadline format: {data['registration_deadline']}. Reset to null.")
                data["registration_deadline"] = None

        # Check: registration_deadline <= start_date
        if start_dt and deadline_dt:
            if deadline_dt > start_dt:
                # Contradiction flagged (deadline cannot be after event starts)
                warnings.append(
                    f"Temporal contradiction detected: registration deadline ({deadline_dt.date()}) is after event start ({start_dt.date()})."
                )

        # 4. URL Validation
        for url_field in ["registration_url", "application_url"]:
            val = data.get(url_field)
            if val:
                parsed = urlparse(val)
                if not (parsed.scheme in ("http", "https") and parsed.netloc):
                    warnings.append(f"Invalid {url_field}: '{val}'. Reset to null.")
                    data[url_field] = None

        # 5. Email Validation
        email = data.get("contact_email")
        if email:
            if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
                warnings.append(f"Invalid contact email format: '{email}'. Reset to null.")
                data["contact_email"] = None

        # Determine final status
        status = "flagged" if warnings else "valid"
        return ValidationResult(
            is_valid=True,
            status=status,
            warnings=warnings,
            validated_data=data
        )
