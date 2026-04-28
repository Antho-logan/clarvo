from __future__ import annotations

from typing import Any

from tools.retrieval import (
    KnowledgeLookupTool,
    SearchCaseLawTool,
    SearchLegislationTool,
)


def test_retrieval_tools_return_empty_hits_without_fallback(monkeypatch) -> None:
    bm25_queries: list[str] = []
    hybrid_queries: list[str] = []

    def fake_bm25_search(query: str, **kwargs: Any) -> list[Any]:
        bm25_queries.append(query)
        return []

    def fake_hybrid_search(query: str, **kwargs: Any) -> list[Any]:
        hybrid_queries.append(query)
        return []

    monkeypatch.setattr("search.bm25_search", fake_bm25_search)
    monkeypatch.setattr("search.hybrid_search", fake_hybrid_search)

    query = "huur opzegtermijn zonder corpusmatch"

    assert SearchLegislationTool().run(query=query, limit=5) == {"hits": []}
    assert KnowledgeLookupTool().run(query=query, limit=5) == {"hits": []}
    assert SearchCaseLawTool().run(query=query, limit=5) == {"hits": []}
    assert bm25_queries == [query, query]
    assert hybrid_queries == [query]
