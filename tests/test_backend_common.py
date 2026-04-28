import pytest

from backend_common import compact_text, normalize_scores, validate_embedding_dimensions


def test_compact_text_normalizes_whitespace() -> None:
    assert compact_text("  Artikel\n\t7:271   BW  ") == "Artikel 7:271 BW"


def test_normalize_scores_scales_non_uniform_scores() -> None:
    assert normalize_scores({"low": 2.0, "high": 6.0}) == {
        "low": 0.0,
        "high": 1.0,
    }


def test_normalize_scores_handles_equal_scores() -> None:
    assert normalize_scores({"a": 3.0, "b": 3.0}) == {"a": 1.0, "b": 1.0}


def test_validate_embedding_dimensions_accepts_expected_width() -> None:
    embedding = validate_embedding_dimensions([1, 0, 0], expected_dimensions=3)

    assert embedding == [1.0, 0.0, 0.0]


def test_validate_embedding_dimensions_rejects_mismatch() -> None:
    with pytest.raises(ValueError, match="expected 3"):
        validate_embedding_dimensions([1.0, 0.0], expected_dimensions=3)
