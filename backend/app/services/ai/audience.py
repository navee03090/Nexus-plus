"""Keep extracted audiences only when the announcement actually names them."""
import re
from typing import Iterable, List, Optional


def _mentioned(corpus: str, token: str) -> bool:
    forms = [token]
    if token.endswith("s") and len(token) > 4:
        forms.append(token[:-1])
    else:
        forms.append(f"{token}s")
    return any(re.search(rf"\b{re.escape(form)}\b", corpus) for form in forms)


def audience_named_in_text(labels: Optional[Iterable[str]], *parts: Optional[str]) -> List[str]:
    corpus = " ".join(part or "" for part in parts).lower()
    kept: List[str] = []
    seen = set()
    for raw in labels or []:
        label = re.sub(r"\s+", " ", str(raw or "")).strip()
        key = label.lower()
        if not label or key in seen or key in {"general", "everyone", "all"}:
            continue
        tokens = re.findall(r"[a-z]{4,}", key)
        if tokens and all(_mentioned(corpus, token) for token in tokens):
            seen.add(key)
            kept.append(label)
    return kept
