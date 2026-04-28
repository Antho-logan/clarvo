from tools import SearchLegislationTool, SummariseDocumentTool


def test_summarise_document_falls_back_without_openai_key(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = SummariseDocumentTool().run(document_text="Artikel 1. " * 200)

    assert "summary" in result
    assert len(result["summary"]) <= 903


def test_tool_input_validation() -> None:
    result = SearchLegislationTool.input_schema.model_validate({"query": "huur", "limit": 2})

    assert result.query == "huur"
    assert result.limit == 2
