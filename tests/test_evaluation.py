from evaluation import compute_ranking_metrics, summarize_cases
from evals.run_eval import DEFAULT_QA_PATH, _article_matches, _load_entries


def test_compute_ranking_metrics() -> None:
    metrics = compute_ranking_metrics([0, 1, 0, 1], expected_count=2, k=4)

    assert metrics.precision_at_k == 0.5
    assert metrics.recall_at_k == 1.0
    assert round(metrics.f1_at_k, 3) == 0.667
    assert metrics.mrr == 0.5
    assert 0 < metrics.ndcg_at_k < 1


def test_summarize_cases_groups_by_domain() -> None:
    summary = summarize_cases(
        [
            {
                "domain": "tenancy_law",
                "metrics": {
                    "precision_at_k": 0.5,
                    "recall_at_k": 1.0,
                    "f1_at_k": 0.667,
                    "mrr": 1.0,
                    "ndcg_at_k": 1.0,
                },
            },
            {
                "domain": "tenancy_law",
                "metrics": {
                    "precision_at_k": 0.0,
                    "recall_at_k": 0.0,
                    "f1_at_k": 0.0,
                    "mrr": 0.0,
                    "ndcg_at_k": 0.0,
                },
            },
        ]
    )

    assert summary["domains"]["tenancy_law"]["recall_at_k"] == 0.5
    assert summary["overall"]["precision_at_k"] == 0.25


def test_curated_qa_starter_set_has_priority_domain_coverage() -> None:
    entries = _load_entries(DEFAULT_QA_PATH)

    assert len(entries) == 30
    assert {entry.domain for entry in entries} == {
        "administrative",
        "employment",
        "tenancy",
    }


def test_article_matching_accepts_book_prefix_or_plain_article() -> None:
    assert _article_matches("271", {"7:271"})
    assert _article_matches("7:271", {"7:271"})
    assert not _article_matches("7:272", {"7:271"})
