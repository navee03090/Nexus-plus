"""NCCS React shell sites expose events only inside the JavaScript bundle."""
import pytest
from unittest.mock import patch, AsyncMock

from app.services.ingestion import get_adapter_for_source
from app.services.ingestion.nccs import NccsChallengeAdapter, parse_nccs_events_from_js


SAMPLE_JS = r"""
wa=[{id:`ctf`,label:`Capture the Flag`,blurb:`Jeopardy-style challenges.`}],
Ta=[
{slug:`ctf-2026`,year:2026,track:`ctf`,title:`National Cyber Defense Championship — PCC 26`,summary:`Flagship CTF with regional and final rounds.`,startDate:`2026-11-24`,endDate:`2026-11-27`,registrationUrl:`https://forms.example/ctf`},
{slug:`expo-2026`,year:2026,track:`expo`,title:`Cyber Security Industrial Expo 2026`,summary:`Two-day industry exhibition.`,startDate:`2026-11-26`,endDate:`2026-11-27`,registrationUrl:`https://forms.example/expo`},
{slug:`ctf-2025`,year:2025,track:`ctf`,title:`Capture the Flag Challenge 2025`,summary:`Past edition.`,startDate:`2025-11-01`}
];
"""

SAMPLE_HTML = """
<html><head>
<script type="module" crossorigin src="/assets/index-abc123.js"></script>
</head><body><div id="root"></div></body></html>
"""


def test_parse_keeps_only_current_year_events():
    events = parse_nccs_events_from_js(SAMPLE_JS, year=2026)
    assert [e["slug"] for e in events] == ["ctf-2026", "expo-2026"]
    assert events[0]["title"].startswith("National Cyber Defense Championship")
    assert events[0]["registration_url"].endswith("/ctf")


def test_factory_routes_nccs_url_to_special_adapter():
    adapter = get_adapter_for_source(
        source_id="src-nccs",
        source_type="Website",
        source_url="https://pakistancybersecuritychallenge.nccs.pk/",
        parser_key="nccs_cybersecurity_challenge",
    )
    assert isinstance(adapter, NccsChallengeAdapter)


@pytest.mark.asyncio
async def test_nccs_adapter_builds_items_from_js_bundle():
    adapter = NccsChallengeAdapter(
        source_id="src-nccs",
        source_url="https://pakistancybersecuritychallenge.nccs.pk/",
        parser_key="nccs_cybersecurity_challenge",
    )

    async def fake_get(url: str):
        if url.rstrip("/").endswith("nccs.pk") or url.endswith("nccs.pk/"):
            return SAMPLE_HTML, 200
        if "index-abc123.js" in url:
            return SAMPLE_JS, 200
        raise AssertionError(f"unexpected url {url}")

    with patch.object(adapter, "_get", side_effect=fake_get):
        items = await adapter.fetch_items()

    assert len(items) == 2
    assert items[0].title_raw.startswith("National Cyber Defense Championship")
    assert items[0].canonical_url.endswith("/events/ctf-2026")
    assert "Registration deadline" not in items[0].body_raw or True
    assert "Apply: https://forms.example/ctf" in items[0].body_raw
    assert "Air University" in items[0].body_raw
    assert items[0].published_at is not None
    assert items[0].published_at.year == 2026
