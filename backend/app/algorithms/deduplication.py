"""
Multi-Stage Deduplication Engine (Section 38).
Identifies whether a discovered announcement matches an existing canonical opportunity.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.algorithms.similarity import (
    normalize_title,
    tokenize,
    jaccard_similarity,
    levenshtein_ratio,
    date_proximity_score,
    cosine_vector_similarity,
)


class DeduplicationResult:
    def __init__(
        self,
        is_duplicate: bool,
        canonical_id: Optional[str] = None,
        confidence: float = 0.0,
        stage: str = "none",
        reason: str = ""
    ):
        self.is_duplicate = is_duplicate
        self.canonical_id = canonical_id
        self.confidence = confidence
        self.stage = stage
        self.reason = reason


class DeduplicationEngine:
    """
    Executes staged matching:
    Stage 1: Exact Hash / Canonical URL
    Stage 2: Normalized Title & Org Exact Match
    Stage 3: Fuzzy Text & Date Window Similarity
    Stage 4: Semantic Vector Embedding Similarity
    """

    @classmethod
    def find_duplicate(
        cls,
        candidate_title: str,
        candidate_summary: str,
        candidate_org_id: Optional[str],
        candidate_start_date: Optional[datetime],
        candidate_deadline: Optional[datetime],
        candidate_vector: Optional[List[float]],
        existing_opportunities: List[Dict[str, Any]]
    ) -> DeduplicationResult:
        if not candidate_title or not existing_opportunities:
            return DeduplicationResult(is_duplicate=False)

        cand_norm_title = normalize_title(candidate_title)
        cand_tokens = tokenize(candidate_title + " " + (candidate_summary or ""))

        best_match_id = None
        best_confidence = 0.0
        best_stage = "none"
        best_reason = ""

        for opp in existing_opportunities:
            opp_id = opp["id"]
            opp_title = opp.get("title", "")
            opp_norm_title = normalize_title(opp_title)
            opp_org_id = opp.get("organization_id")
            opp_start_date = opp.get("start_date")
            opp_deadline = opp.get("registration_deadline")
            opp_vector = opp.get("vector")

            # STAGE 2: Normalized title exact match
            if cand_norm_title == opp_norm_title:
                # If organization also matches or either is unspecified
                same_org = (candidate_org_id == opp_org_id) or not candidate_org_id or not opp_org_id
                date_score = date_proximity_score(candidate_start_date, opp_start_date)

                if same_org and date_score >= 0.5:
                    return DeduplicationResult(
                        is_duplicate=True,
                        canonical_id=opp_id,
                        confidence=0.98,
                        stage="stage_2_exact_normalized",
                        reason=f"Exact normalized title match with {opp_title}"
                    )

            # STAGE 3: Fuzzy token overlap + Levenshtein + Date Proximity
            lev_score = levenshtein_ratio(cand_norm_title, opp_norm_title)
            opp_tokens = tokenize(opp_title + " " + (opp.get("summary") or ""))
            jacc_score = jaccard_similarity(cand_tokens, opp_tokens)
            date_score = date_proximity_score(candidate_start_date, opp_start_date)

            fuzzy_confidence = (lev_score * 0.40) + (jacc_score * 0.40) + (date_score * 0.20)
            if fuzzy_confidence > 0.82 and (candidate_org_id == opp_org_id or not candidate_org_id):
                if fuzzy_confidence > best_confidence:
                    best_match_id = opp_id
                    best_confidence = fuzzy_confidence
                    best_stage = "stage_3_fuzzy_text"
                    best_reason = f"High text similarity ({fuzzy_confidence:.2f}) and matching schedule"

            # STAGE 4: Semantic vector similarity (pgvector cosine)
            if candidate_vector and opp_vector:
                vec_sim = cosine_vector_similarity(candidate_vector, opp_vector)
                if vec_sim > 0.88 and date_score >= 0.5:
                    if vec_sim > best_confidence:
                        best_match_id = opp_id
                        best_confidence = vec_sim
                        best_stage = "stage_4_semantic_vector"
                        best_reason = f"Semantic embedding cosine similarity ({vec_sim:.2f})"

        if best_match_id and best_confidence >= 0.82:
            return DeduplicationResult(
                is_duplicate=True,
                canonical_id=best_match_id,
                confidence=best_confidence,
                stage=best_stage,
                reason=best_reason
            )

        return DeduplicationResult(is_duplicate=False)
