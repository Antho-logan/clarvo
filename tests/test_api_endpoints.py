"""End-to-end tests for the FastAPI surface using TestClient."""

from __future__ import annotations

import uuid
import base64
from datetime import date

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from parsers.rechtspraak_parser import JudgmentDocument
from repositories.legal_documents import insert_judgment_document


def _seed_judgment(ecli: str = "ECLI:NL:HR:2024:XYZ") -> None:
    insert_judgment_document(
        JudgmentDocument(
            source_type="case_law",
            source_system="rechtspraak",
            ecli=ecli,
            court="Hoge Raad",
            decision_date=date(2024, 1, 1),
            subject="Arbeidsrecht",
            raw_xml="<rdf:RDF/>",
            text="Werknemer heeft een opzegtermijn van twee maanden.",
            metadata={"body_paragraph_count": 1},
        ),
        domain="employment_law",
        source_url="https://example/rechtspraak/xyz",
    )


def test_health_does_not_require_auth(api_client: TestClient) -> None:
    response = api_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_document_extraction_requires_bearer_token(api_client: TestClient) -> None:
    response = api_client.post(
        "/agent/extract-document",
        json={
            "filename": "contract.txt",
            "content_type": "text/plain",
            "data_base64": base64.b64encode(b"contract").decode(),
        },
    )

    assert response.status_code == 401


def test_document_extraction_returns_text(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = api_client.post(
        "/agent/extract-document",
        headers=auth_headers,
        json={
            "filename": "contract.txt",
            "content_type": "text/plain",
            "data_base64": base64.b64encode("Opzegtermijn twee maanden.".encode()).decode(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "contract.txt"
    assert body["text"] == "Opzegtermijn twee maanden."
    assert body["truncated"] is False


def test_documents_requires_bearer_token(api_client: TestClient) -> None:
    response = api_client.get("/documents")
    assert response.status_code == 401


def test_documents_endpoint_returns_samples(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    _seed_judgment()
    response = api_client.get("/documents", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["count"] >= 1
    assert body["documents"][0]["source_type"] == "case_law"


def test_get_documents_by_source_id(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    _seed_judgment("ECLI:NL:HR:2024:LOOKUP")
    response = api_client.get(
        "/documents/ECLI:NL:HR:2024:LOOKUP",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["count"] == 1

    missing = api_client.get("/documents/BWBR0-none", headers=auth_headers)
    assert missing.status_code == 404


def test_laws_endpoint_returns_legislation(
    api_client: TestClient, auth_headers: dict[str, str], db_session
) -> None:
    from datetime import datetime, timezone

    from parsers.bwb_parser import LawArticle, LawDocument
    from repositories.legal_documents import insert_law_document

    document = LawDocument(
        source_type="legislation",
        source_system="bwb",
        bwbr_id="BWBR0005000",
        title="Testwet",
        raw_xml="<toestand/>",
        articles=[
            LawArticle(article_number="1", section_number="1", text="Artikel 1 tekst.")
        ],
        metadata={"article_count": 1},
    )
    insert_law_document(
        document,
        source_url="https://example/bwb/BWBR0005000",
        fetched_at=datetime.now(timezone.utc),
        domain="employment_law",
    )

    response = api_client.get("/laws/BWBR0005000", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["bwb_id"] == "BWBR0005000"
    assert body["count"] == 1

    missing = api_client.get("/laws/BWBR9999", headers=auth_headers)
    assert missing.status_code == 404


def test_judgments_endpoint_returns_judgment_rows(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    _seed_judgment("ECLI:NL:RBAMS:2024:J1")
    response = api_client.get(
        "/judgments/ECLI:NL:RBAMS:2024:J1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["ecli"] == "ECLI:NL:RBAMS:2024:J1"

    missing = api_client.get("/judgments/ECLI:NL:HR:2099:ZZ", headers=auth_headers)
    assert missing.status_code == 404


def test_search_endpoint_returns_hits(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    _seed_judgment("ECLI:NL:HR:2024:SEARCH")
    response = api_client.get(
        "/search",
        params={"q": "opzegtermijn"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "opzegtermijn"
    assert body["count"] >= 1


def test_search_endpoint_requires_query(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = api_client.get("/search", headers=auth_headers)
    assert response.status_code == 422


def test_search_endpoint_rejects_inverted_date_range(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = api_client.get(
        "/search",
        params={
            "q": "huur",
            "date_from": "2025-01-01",
            "date_to": "2024-01-01",
        },
        headers=auth_headers,
    )

    assert response.status_code == 422
    assert "date_from" in response.json()["detail"]


def test_agent_stream_emits_token_citation_and_done_events(
    api_client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import api.main as api_main

    monkeypatch.setattr(
        api_main,
        "chat",
        lambda *args, **kwargs: {
            "status": "grounded",
            "answer": "Bron antwoord.",
            "question": "vraag",
            "source_ids": ["BWBR0005290"],
            "citations": [
                {
                    "id": "doc-1",
                    "source_type": "legislation",
                    "source_id": "BWBR0005290",
                    "domain": "tenancy_law",
                    "title": "BW Boek 7",
                    "article": "7:271",
                    "section": None,
                    "court": None,
                    "decision_date": None,
                    "source_url": None,
                    "snippet": "Opzegging huur.",
                }
            ],
            "tool_trace": [],
        },
    )

    response = api_client.post(
        "/agent/stream",
        headers=auth_headers,
        json={"question": "vraag", "domain": "tenancy_law"},
    )

    assert response.status_code == 200
    body = response.text
    assert '"type": "token"' in body
    assert '"type": "citation"' in body
    assert '"type": "done"' in body


def test_matters_crud_end_to_end(
    api_client: TestClient, auth_headers: dict[str, str], ensure_user
) -> None:
    ensure_user("test-user", "test@example.com")

    created = api_client.post(
        "/matters",
        headers=auth_headers,
        json={
            "title": "Zaak API",
            "client": "Klant BV",
            "rechtsgebied": "employment_law",
        },
    )
    assert created.status_code == 200
    matter = created.json()["matter"]
    matter_id = matter["id"]

    listed = api_client.get("/matters", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["count"] == 1

    patched = api_client.patch(
        f"/matters/{matter_id}",
        headers=auth_headers,
        json={"title": "Zaak API Updated", "status": "pending"},
    )
    assert patched.status_code == 200
    assert patched.json()["matter"]["title"] == "Zaak API Updated"

    fetched = api_client.get(f"/matters/{matter_id}", headers=auth_headers)
    assert fetched.status_code == 200

    missing = api_client.get(f"/matters/{uuid.uuid4()}", headers=auth_headers)
    assert missing.status_code == 404

    deleted = api_client.delete(f"/matters/{matter_id}", headers=auth_headers)
    assert deleted.status_code == 200


def test_create_matter_requires_title(
    api_client: TestClient, auth_headers: dict[str, str], ensure_user
) -> None:
    ensure_user("test-user", "test@example.com")
    response = api_client.post("/matters", headers=auth_headers, json={"client": "X"})
    assert response.status_code == 422

    blank = api_client.post(
        "/matters",
        headers=auth_headers,
        json={"title": "   ", "client": "X"},
    )
    assert blank.status_code == 422


def test_matter_endpoints_reject_invalid_uuid_inputs(
    api_client: TestClient, auth_headers: dict[str, str], ensure_user
) -> None:
    ensure_user("test-user", "test@example.com")
    matter = api_client.post(
        "/matters",
        headers=auth_headers,
        json={"title": "UUID validation"},
    )
    matter_id = matter.json()["matter"]["id"]

    fetched = api_client.get("/matters/not-a-uuid", headers=auth_headers)
    assert fetched.status_code == 422
    assert fetched.json()["detail"] == "matter_id must be a valid UUID."

    linked = api_client.post(
        f"/matters/{matter_id}/link-document",
        headers=auth_headers,
        json={"document_id": "not-a-uuid"},
    )
    assert linked.status_code == 422
    assert linked.json()["detail"] == "document_id must be a valid UUID."


def test_link_document_and_run(
    api_client: TestClient, auth_headers: dict[str, str], ensure_user, db_session
) -> None:
    ensure_user("test-user", "test@example.com")
    matter_response = api_client.post(
        "/matters",
        headers=auth_headers,
        json={"title": "Matter with links"},
    )
    matter_id = matter_response.json()["matter"]["id"]

    doc_id = str(uuid.uuid4())
    db_session.execute(
        text(
            "INSERT INTO documents (id, document_type, text, effective_from, effective_to, created_at, updated_at) "
            "VALUES (:id, 'law_article', 'stub', '1900-01-01', '9999-12-31', now(), now())"
        ),
        {"id": doc_id},
    )
    db_session.commit()

    link_doc = api_client.post(
        f"/matters/{matter_id}/link-document",
        headers=auth_headers,
        json={"document_id": doc_id},
    )
    assert link_doc.status_code == 200
    assert link_doc.json()["status"] == "linked"

    link_run = api_client.post(
        f"/matters/{matter_id}/link-run",
        headers=auth_headers,
        json={"run_id": "run-1", "run_type": "agent"},
    )
    assert link_run.status_code == 200

    missing = api_client.post(
        f"/matters/{uuid.uuid4()}/link-run",
        headers=auth_headers,
        json={"run_id": "run-2"},
    )
    assert missing.status_code == 404


def test_save_research_note_persists_on_default_matter(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = api_client.post(
        "/matters/research-notes",
        headers=auth_headers,
        json={
            "question": "Wat geldt bij opzegging van huur van woonruimte?",
            "answer": "Brononderbouwd antwoord.",
            "status": "grounded",
            "source_ids": ["BWBR0005290"],
            "domains": ["tenancy_law"],
            "citations": [
                {
                    "id": "doc-1",
                    "source_id": "BWBR0005290",
                    "source_type": "legislation",
                    "domain": "tenancy_law",
                    "title": "BW Boek 7",
                    "article": "7:271",
                    "section": None,
                    "court": None,
                    "decision_date": None,
                    "source_url": None,
                    "snippet": "Opzegging huur.",
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["matter"]["title"] == "Demo Matter"
    assert body["note"]["citation_count"] == 1
    assert body["note"]["citations"][0]["source_id"] == "BWBR0005290"

    listed = api_client.get("/matters", headers=auth_headers)
    assert listed.status_code == 200
    matter = listed.json()["matters"][0]
    research_notes = matter["tags"]["research_notes"]
    assert research_notes[0]["question"] == "Wat geldt bij opzegging van huur van woonruimte?"
    assert research_notes[0]["answer"] == "Brononderbouwd antwoord."
    assert research_notes[0]["citations"][0]["article"] == "7:271"


def test_save_research_note_rejects_refusal(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = api_client.post(
        "/matters/research-notes",
        headers=auth_headers,
        json={
            "question": "Kun je mijn volledige belastingaangifte doen?",
            "answer": "Outside current coverage.",
            "status": "insufficient_sources",
            "source_ids": [],
            "domains": [],
            "citations": [],
        },
    )

    assert response.status_code == 422


def test_create_research_memo_from_saved_note(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    saved = api_client.post(
        "/matters/research-notes",
        headers=auth_headers,
        json={
            "question": "Wanneer is ontslag op staande voet geldig?",
            "answer": "Een dringende reden en onverwijlde mededeling zijn vereist.",
            "status": "grounded",
            "source_ids": ["BWBR0005290"],
            "domains": ["employment_law"],
            "citations": [
                {
                    "id": "doc-2",
                    "source_id": "BWBR0005290",
                    "source_type": "legislation",
                    "domain": "employment_law",
                    "title": "Burgerlijk Wetboek Boek 7",
                    "article": "7:677",
                    "section": None,
                    "court": None,
                    "decision_date": None,
                    "source_url": None,
                    "snippet": "Dringende reden.",
                }
            ],
        },
    )
    assert saved.status_code == 200
    saved_body = saved.json()

    response = api_client.post(
        "/matters/research-memos",
        headers=auth_headers,
        json={
            "matter_id": saved_body["matter"]["id"],
            "source_note_id": saved_body["note"]["id"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    memo = body["memo"]
    assert memo["type"] == "research_memo"
    assert memo["status"] == "draft"
    assert memo["lawyer_review_required"] is True
    assert memo["citation_count"] == 1
    assert memo["citations"][0]["article"] == "7:677"
    assert body["matter"]["tags"]["research_memos"][0]["id"] == memo["id"]


def test_create_research_memo_rejects_uncited_note(
    api_client: TestClient, auth_headers: dict[str, str], ensure_user
) -> None:
    ensure_user("test-user", "test@example.com")
    matter = api_client.post(
        "/matters",
        headers=auth_headers,
        json={
            "title": "Manual uncited matter",
            "tags": {
                "research_notes": [
                    {
                        "id": "uncited-note",
                        "type": "assistant_research_note",
                        "question": "Vraag zonder bron?",
                        "answer": "Geen bron.",
                        "status": "grounded",
                        "source_ids": [],
                        "citations": [],
                        "citation_count": 0,
                        "domains": [],
                        "created_at": "2026-05-07T10:00:00Z",
                    }
                ]
            },
        },
    )
    assert matter.status_code == 200

    response = api_client.post(
        "/matters/research-memos",
        headers=auth_headers,
        json={
            "matter_id": matter.json()["matter"]["id"],
            "source_note_id": "uncited-note",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "Memo generation is only available for grounded research notes with citations."
    )


def test_settings_get_and_patch(
    api_client: TestClient, auth_headers: dict[str, str], ensure_user
) -> None:
    ensure_user("test-user", "test@example.com")
    initial = api_client.get("/settings", headers=auth_headers)
    assert initial.status_code == 200
    assert initial.json()["settings"]["theme_preference"] == "system"
    assert initial.json()["settings"]["language_preference"] == "nl"

    patched = api_client.patch(
        "/settings",
        headers=auth_headers,
        json={
            "theme_preference": "dark",
            "firm_name": "Test BV",
            "language_preference": "en",
        },
    )
    assert patched.status_code == 200
    settings = patched.json()["settings"]
    assert settings["theme_preference"] == "dark"
    assert settings["firm_name"] == "Test BV"
    assert settings["language_preference"] == "en"


def test_ingestion_jobs_list_and_detail(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    from repositories.ingestion_jobs import create_job

    job = create_job(
        job_type="curated_laws",
        source_system="bwb",
        domain=None,
        total_items=1,
    )
    listed = api_client.get("/ingestion/jobs", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["count"] >= 1

    detail = api_client.get(f"/ingestion/jobs/{job.id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["job"]["id"] == job.id

    missing = api_client.get("/ingestion/jobs/99999", headers=auth_headers)
    assert missing.status_code == 404


def test_embedding_coverage_endpoint(
    api_client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CLARVO_OWNER_EMAILS", "test@example.com")
    response = api_client.get("/embeddings/coverage", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["totals"] == {"total": 0}
    assert body["groups"] == []


def test_workflows_list_and_run(
    api_client: TestClient, auth_headers: dict[str, str]
) -> None:
    workflows = api_client.get("/workflows", headers=auth_headers)
    assert workflows.status_code == 200
    body = workflows.json()
    assert body["count"] >= 1

    unknown = api_client.post(
        "/workflows/does-not-exist/run",
        headers=auth_headers,
        json={"question": "test"},
    )
    assert unknown.status_code == 404


def test_invalid_token_is_rejected(api_client: TestClient) -> None:
    headers = {"Authorization": "Bearer invalid.token.value"}
    response = api_client.get("/documents", headers=headers)
    assert response.status_code == 401


def test_token_without_subject_is_rejected(
    api_client: TestClient, auth_secret: str
) -> None:
    token = jwt.encode({"aud": "veridicta-api"}, auth_secret, algorithm="HS256")
    response = api_client.get(
        "/documents",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
