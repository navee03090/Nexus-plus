"""
Eligibility Rule Evaluation Engine (Section 21).
Evaluates machine-readable eligibility criteria without false certainty.
Returns: 'Eligible', 'Likely eligible', 'Eligibility unclear'.
"""
from typing import Dict, Any, List, Tuple


class EligibilityEngine:
    """Evaluates student and professional eligibility criteria."""

    @classmethod
    def evaluate_eligibility(
        cls,
        user_profile: Dict[str, Any],
        opportunity: Dict[str, Any],
        rules: List[Dict[str, Any]]
    ) -> Tuple[str, List[str]]:
        """
        Evaluates user profile against opportunity eligibility rules.
        Returns: (status, reasons) where status is one of:
        'Eligible', 'Likely eligible', 'Eligibility unclear'
        """
        reasons: List[str] = []
        uncertainties: List[str] = []

        eligibility_summary = (opportunity.get("eligibility_summary") or "").lower()
        target_audience = [str(a).lower() for a in (opportunity.get("target_audience") or [])]

        if not eligibility_summary and not target_audience and not rules:
            return "Likely eligible", ["Open call with no restrictive prerequisites stated"]

        # Nationality / Country
        user_country = (user_profile.get("country") or "Pakistan").lower()
        if "pakistani" in eligibility_summary or "pakistan" in eligibility_summary:
            if user_country == "pakistan":
                reasons.append("Pakistani citizen criteria satisfied")
            else:
                return "Ineligible", ["Announcement is restricted to Pakistani citizens"]

        # Education level
        user_edu = (user_profile.get("education_level") or "").lower()
        if user_edu:
            if "undergraduate" in eligibility_summary or any("undergraduate" in a for a in target_audience):
                if "undergraduate" in user_edu or "bachelor" in user_edu or "bs" in user_edu:
                    reasons.append("Undergraduate student status matches")
                elif "phd" in user_edu or "postgraduate" in user_edu:
                    uncertainties.append("Event is targeted at undergraduate level")

            if "phd" in eligibility_summary or "postgraduate" in eligibility_summary:
                if "phd" in user_edu or "postgraduate" in user_edu or "ms" in user_edu:
                    reasons.append("Postgraduate / PhD qualification matches")

        # University specific
        user_uni = (user_profile.get("university") or "").lower()
        if "uet peshawar" in eligibility_summary and "only" in eligibility_summary:
            if "uet" in user_uni:
                reasons.append("UET Peshawar campus requirement satisfied")
            else:
                uncertainties.append("May require enrollment at UET Peshawar")

        if uncertainties:
            return "Likely eligible", reasons + [f"Check details: {u}" for u in uncertainties]

        if reasons:
            return "Eligible", reasons

        return "Eligibility unclear", ["Source does not specify exhaustive eligibility requirements"]
