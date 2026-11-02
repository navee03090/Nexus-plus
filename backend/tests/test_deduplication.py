"""
Unit tests for Deduplication Engine (Section 38).
"""
from datetime import datetime, timezone
from app.algorithms.deduplication import DeduplicationEngine
from app.algorithms.similarity import normalize_title


def test_normalize_title():
    t1 = "Call for Registration: KP AI & Cybersecurity Hackathon 2026!"
    t2 = "KP AI and Cybersecurity Hackathon 2026"
    assert "hackathon" in normalize_title(t1)
    assert "cybersecurity" in normalize_title(t1)


def test_exact_normalized_title_match():
    existing = [
        {
            "id": "opp-001",
            "title": "KP AI & Cybersecurity Hackathon 2026",
            "summary": "Provincial hackathon organized by UET and KPITB.",
            "organization_id": "org-uet",
            "start_date": datetime(2026, 10, 24, 9, 0, tzinfo=timezone.utc),
            "registration_deadline": datetime(2026, 10, 18, 23, 59, tzinfo=timezone.utc),
            "vector": None,
        }
    ]

    res = DeduplicationEngine.find_duplicate(
        candidate_title="KP AI and Cybersecurity Hackathon 2026",
        candidate_summary="Hackathon hosted at UET Peshawar campus.",
        candidate_org_id="org-uet",
        candidate_start_date=datetime(2026, 10, 24, 9, 0, tzinfo=timezone.utc),
        candidate_deadline=datetime(2026, 10, 18, 23, 59, tzinfo=timezone.utc),
        candidate_vector=None,
        existing_opportunities=existing
    )

    assert res.is_duplicate is True
    assert res.canonical_id == "opp-001"
    assert res.stage == "stage_2_exact_normalized"


def test_distinct_events_not_flagged_as_duplicate():
    existing = [
        {
            "id": "opp-001",
            "title": "KP AI & Cybersecurity Hackathon 2026",
            "summary": "Provincial hackathon organized by UET and KPITB.",
            "organization_id": "org-uet",
            "start_date": datetime(2026, 10, 24, 9, 0, tzinfo=timezone.utc),
            "registration_deadline": datetime(2026, 10, 18, 23, 59, tzinfo=timezone.utc),
            "vector": None,
        }
    ]

    res = DeduplicationEngine.find_duplicate(
        candidate_title="NIC Peshawar DeepTech Acceleration Cohort 8",
        candidate_summary="Incubation program for robotics and healthtech startups.",
        candidate_org_id="org-nic",
        candidate_start_date=datetime(2026, 11, 1, 10, 0, tzinfo=timezone.utc),
        candidate_deadline=datetime(2026, 10, 20, 23, 59, tzinfo=timezone.utc),
        candidate_vector=None,
        existing_opportunities=existing
    )

    assert res.is_duplicate is False
    assert res.canonical_id is None
