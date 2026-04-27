from __future__ import annotations

from ingestion.curated_ingestion import _select_seeds


def test_select_seeds_defaults_to_priority_domains_only() -> None:
    from ingestion.curated_ingestion import CuratedSeed

    seed_map = {
        "employment_law": [CuratedSeed(domain="employment_law", identifier="A")],
        "tenancy_law": [CuratedSeed(domain="tenancy_law", identifier="B")],
        "administrative_law": [CuratedSeed(domain="administrative_law", identifier="C")],
        "immigration_law": [CuratedSeed(domain="immigration_law", identifier="D")],
        "sme_business_law": [CuratedSeed(domain="sme_business_law", identifier="E")],
    }
    selected = _select_seeds(seed_map, domain=None, limit=None)

    assert [seed.domain for seed in selected] == [
        "employment_law",
        "tenancy_law",
        "administrative_law",
    ]


def test_select_seeds_keeps_domain_scope_and_limit() -> None:
    from ingestion.curated_ingestion import CuratedSeed

    seed_map = {
        "employment_law": [
            CuratedSeed(domain="employment_law", identifier="A", priority=2),
            CuratedSeed(domain="employment_law", identifier="B", priority=1),
        ],
        "tenancy_law": [CuratedSeed(domain="tenancy_law", identifier="C", priority=1)],
    }

    selected = _select_seeds(seed_map, domain="employment_law", limit=1)

    assert [seed.identifier for seed in selected] == ["A"]
