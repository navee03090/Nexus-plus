"""
Scoring engines for NEXUS PULSE:
1. Trust & Confidence Calculation (Section 36)
2. Personalization & Relevance Scoring (Section 20)
3. Deadline Urgency Categorization (Section 95)
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple


def calculate_composite_trust_score(
    ai_confidence: float,
    source_trust: float,
    has_valid_url: bool,
    has_valid_dates: bool,
    cross_source_count: int = 1,
) -> float:
    """
    Computes holistic trust score without relying blindly on AI alone.
    Weights:
    - Source trust: 35%
    - AI confidence: 30%
    - Date validity & presence: 15%
    - Registration link validity: 10%
    - Multi-source confirmation bonus: 10%
    """
    base_trust = (source_trust * 0.35) + (ai_confidence * 0.30)

    date_score = 0.15 if has_valid_dates else 0.05
    url_score = 0.10 if has_valid_url else 0.02

    # Cross-source verification bonus (e.g., both Facebook and UET website announce the same event)
    confirmation_bonus = min(0.10, (cross_source_count - 1) * 0.05) if cross_source_count > 1 else 0.0

    total = base_trust + date_score + url_score + confirmation_bonus
    return min(1.0, max(0.0, round(total, 4)))


def calculate_relevance(
    user_profile: Dict[str, Any],
    opportunity: Dict[str, Any],
    opportunity_tags: List[str]
) -> Tuple[int, List[str]]:
    """
    Calculates personalized match score (0-100%) and generates
    transparent 'Why this matches you' explanation bullet points.
    """
    score = 40  # Baseline discovery score
    reasons: List[str] = []

    user_interests = set(i.lower() for i in user_profile.get("interests", []))
    opp_tags_lower = set(t.lower() for t in opportunity_tags)
    matched_interests = user_interests.intersection(opp_tags_lower)

    if matched_interests:
        count = len(matched_interests)
        score += min(35, count * 15)
        for tag_name in list(matched_interests)[:2]:
            reasons.append(f"Matches your interest in {tag_name.title()}")

    # Field of study / major matching
    user_field = (user_profile.get("field_of_study") or "").lower()
    if user_field:
        if any(user_field in t for t in opp_tags_lower) or user_field in (opportunity.get("description") or "").lower():
            score += 10
            reasons.append(f"Directly relevant to {user_field.title()}")

    # Education level check
    user_edu = (user_profile.get("education_level") or "").lower()
    target_audience = [str(a).lower() for a in (opportunity.get("target_audience") or [])]
    if user_edu:
        if any(user_edu in a for a in target_audience) or user_edu in (opportunity.get("eligibility_summary") or "").lower():
            score += 10
            reasons.append(f"Open to {user_edu.title()} level")

    # City / location match
    user_city = (user_profile.get("city") or "").lower()
    opp_city = (opportunity.get("city") or "").lower()
    is_online = opportunity.get("is_online", False)

    if is_online:
        score += 5
        reasons.append("Virtual / Online participation available")
    elif user_city and opp_city and user_city == opp_city:
        score += 10
        reasons.append(f"Happening in your city ({user_city.title()})")

    # Deadline proximity urgency
    deadline = opportunity.get("registration_deadline")
    if deadline:
        if isinstance(deadline, str):
            try:
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            except Exception:
                deadline = None

        if deadline:
            now = datetime.now(timezone.utc)
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            delta_days = (deadline - now).total_seconds() / 86400.0
            if 0 < delta_days <= 3:
                score += 5
                reasons.append("Registration closing in less than 72 hours")
            elif delta_days < 0:
                score -= 30  # Penalize expired

    final_score = min(99, max(15, score))
    if not reasons:
        reasons.append("Featured trending announcement in Pakistan")

    return final_score, reasons


def get_deadline_urgency(deadline: Optional[datetime]) -> Tuple[str, Optional[str]]:
    """
    Calculates urgency status:
    - Normal
    - Closing Soon (within 7 days)
    - Urgent (within 48 hours)
    - Expired (past deadline)
    Also returns a human-friendly label like '3 days left' or '18 hours left'.
    """
    if not deadline:
        return "Normal", "No deadline specified"

    now = datetime.now(timezone.utc)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    diff = (deadline - now).total_seconds()
    if diff <= 0:
        return "Expired", "Registration Closed"

    hours = diff / 3600.0
    days = diff / 86400.0

    if hours <= 48:
        if hours <= 1:
            return "Urgent", "Closes in under 1 hour!"
        return "Urgent", f"Closes in {int(hours)} hours"
    elif days <= 7:
        return "Closing Soon", f"Closes in {int(days)} days"
    else:
        return "Normal", f"Closes in {int(days)} days"
