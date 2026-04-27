from __future__ import annotations

from sources.rechtspraak_search_client import _parse_search_feed, search_judgment_entries


ATOM_FIXTURE = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>ECLI:NL:TEST:2026:1</id>
    <title type="text">ECLI:NL:TEST:2026:1, Huur woonruimte</title>
    <summary type="text">Geschil tussen huurder en verhuurder.</summary>
    <updated>2026-04-18T08:03:03Z</updated>
    <link rel="alternate" type="text/html" href="https://uitspraken.rechtspraak.nl/details?id=ECLI:NL:TEST:2026:1" />
  </entry>
  <entry>
    <id>ECLI:NL:TEST:2026:2</id>
    <title type="text">ECLI:NL:TEST:2026:2, Arbeidsrecht</title>
    <summary type="text">Ontslag op staande voet.</summary>
    <updated>2026-04-17T08:03:03Z</updated>
  </entry>
</feed>
"""


def test_parse_search_feed_extracts_atom_entries() -> None:
    entries = _parse_search_feed(ATOM_FIXTURE)

    assert [entry.ecli for entry in entries] == ["ECLI:NL:TEST:2026:1", "ECLI:NL:TEST:2026:2"]
    assert entries[0].url == "https://uitspraken.rechtspraak.nl/details?id=ECLI:NL:TEST:2026:1"


def test_search_judgment_entries_filters_keywords(monkeypatch) -> None:
    calls: list[dict[str, str]] = []

    def fake_get(params: dict[str, str]) -> bytes:
        calls.append(params)
        return ATOM_FIXTURE

    monkeypatch.setattr("sources.rechtspraak_search_client._http_get_search_feed", fake_get)

    entries = search_judgment_entries(
        subject="http://psi.rechtspraak.nl/rechtsgebied#civielRecht",
        limit=5,
        keywords=("huur",),
        page_size=50,
    )

    assert [entry.ecli for entry in entries] == ["ECLI:NL:TEST:2026:1"]
    assert calls[0]["subject"] == "http://psi.rechtspraak.nl/rechtsgebied#civielRecht"
    assert calls[0]["max"] == "50"
