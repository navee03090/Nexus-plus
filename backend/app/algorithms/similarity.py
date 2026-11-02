"""
Text and date similarity algorithms for opportunity comparison and deduplication.
"""
import re
import math
from typing import List, Set, Optional
from datetime import datetime


def normalize_title(title: str) -> str:
    """Normalizes titles by stripping punctuation, extra whitespace, stop words, and update markers."""
    if not title:
        return ""
    text = title.lower()
    # Strip common announcement update markers so updates match canonical events
    update_patterns = [
        r"\bdeadline\s+extended\b",
        r"\blast\s+date\s+extended\b",
        r"\bdate\s+extended\b",
        r"\bimportant\s+announcement\b",
        r"\burgent\s+notice\b",
        r"\bupdate\b",
        r"\bpostponed\b",
    ]
    for pattern in update_patterns:
        text = re.sub(pattern, " ", text)
    # Strip symbols
    text = re.sub(r"[^\w\s]", " ", text)
    # Strip common noise words in event titles
    stopwords = {"a", "an", "the", "and", "or", "in", "on", "at", "for", "of", "to", "by", "with"}
    tokens = [w for w in text.split() if w not in stopwords]
    return " ".join(tokens)


def tokenize(text: str) -> Set[str]:
    """Extracts lowercase alphabetic tokens."""
    if not text:
        return set()
    return set(re.findall(r"\b[a-z0-9]{2,}\b", text.lower()))


def jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Calculates Jaccard index between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0


def levenshtein_ratio(s1: str, s2: str) -> float:
    """Computes Levenshtein similarity ratio between 0.0 and 1.0."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    s1 = s1.lower().strip()
    s2 = s2.lower().strip()
    if s1 == s2:
        return 1.0

    len1, len2 = len(s1), len(s2)
    # Fast DP with two rows
    prev_row = list(range(len2 + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1] + [0] * len2
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (0 if c1 == c2 else 1)
            curr_row[j + 1] = min(insertions, deletions, substitutions)
        prev_row = curr_row

    distance = prev_row[len2]
    max_len = max(len1, len2)
    return 1.0 - (distance / max_len)


def date_proximity_score(dt1: Optional[datetime], dt2: Optional[datetime], max_delta_days: int = 14) -> float:
    """
    Returns 1.0 if dates are identical, declining towards 0 if dates differ by more than max_delta_days.
    Returns 0.5 if either date is None (neutral uncertainty).
    """
    if dt1 is None or dt2 is None:
        return 0.5

    delta_days = abs((dt1 - dt2).total_seconds()) / 86400.0
    if delta_days == 0:
        return 1.0
    if delta_days >= max_delta_days:
        return 0.0

    return 1.0 - (delta_days / max_delta_days)


def cosine_vector_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
