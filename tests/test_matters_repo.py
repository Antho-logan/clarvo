"""Tests for repositories/matters.py and user settings repository."""

from __future__ import annotations

import uuid
from datetime import date

import pytest

from repositories.matters import (
    MatterInput,
    ResearchMemoInput,
    ResearchNoteInput,
    create_research_memo,
    create_matter,
    delete_matter,
    get_matter,
    link_document,
    link_run,
    list_matters,
    save_research_note,
    update_matter,
)
from repositories.user_settings import get_or_create_settings, update_settings


def test_matter_crud_happy_path(ensure_user, db_session) -> None:
    user_id = ensure_user("repo-user-1", "repo1@example.com")
    created = create_matter(
        user_id=user_id,
        values=MatterInput(
            title="Zaak-001",
            client="Acme BV",
            status="active",
            opened_at=date(2024, 1, 1),
            rechtsgebied="employment_law",
            description="Initial description.",
            tags={"priority": "high"},
        ),
    )
    assert created.title == "Zaak-001"
    assert created.client == "Acme BV"
    assert created.tags == {"priority": "high"}

    fetched = get_matter(user_id=user_id, matter_id=str(created.id))
    assert fetched.id == created.id

    updated = update_matter(
        user_id=user_id,
        matter_id=str(created.id),
        values={"title": "Zaak-001 gewijzigd", "status": "pending", "bogus": "ignored"},
    )
    assert updated.title == "Zaak-001 gewijzigd"
    assert updated.status == "pending"

    listed = list_matters(user_id=user_id, query="gewijzigd", status="pending", rechtsgebied="employment_law")
    assert [matter.id for matter in listed] == [created.id]


def test_list_matters_respects_user_isolation(ensure_user) -> None:
    alice = ensure_user("alice", "alice@example.com")
    bob = ensure_user("bob", "bob@example.com")
    create_matter(user_id=alice, values=MatterInput(title="Alice matter"))
    create_matter(user_id=bob, values=MatterInput(title="Bob matter"))

    alice_matters = list_matters(user_id=alice)
    bob_matters = list_matters(user_id=bob)
    assert [matter.title for matter in alice_matters] == ["Alice matter"]
    assert [matter.title for matter in bob_matters] == ["Bob matter"]


def test_get_matter_missing_raises(ensure_user) -> None:
    user_id = ensure_user("missing-user", "missing@example.com")
    with pytest.raises(LookupError):
        get_matter(user_id=user_id, matter_id=str(uuid.uuid4()))


def test_matter_uuid_inputs_are_validated(ensure_user) -> None:
    user_id = ensure_user("invalid-uuid-user", "invalid-uuid@example.com")
    with pytest.raises(ValueError, match="matter_id must be a valid UUID"):
        get_matter(user_id=user_id, matter_id="not-a-uuid")

    matter = create_matter(user_id=user_id, values=MatterInput(title="UUID validation"))
    with pytest.raises(ValueError, match="document_id must be a valid UUID"):
        link_document(
            user_id=user_id,
            matter_id=str(matter.id),
            document_id="not-a-uuid",
        )


def test_update_matter_missing_raises(ensure_user) -> None:
    user_id = ensure_user("missing-user-2", "missing2@example.com")
    with pytest.raises(LookupError):
        update_matter(
            user_id=user_id,
            matter_id=str(uuid.uuid4()),
            values={"title": "wont happen"},
        )


def test_delete_matter_archives_by_updating_status(ensure_user) -> None:
    user_id = ensure_user("archive-user", "archive@example.com")
    created = create_matter(user_id=user_id, values=MatterInput(title="to archive"))
    delete_matter(user_id=user_id, matter_id=str(created.id))
    archived = get_matter(user_id=user_id, matter_id=str(created.id))
    assert archived.status == "archived"
    assert archived.closed_at is not None


def test_link_document_and_link_run_succeed(ensure_user, db_session) -> None:
    user_id = ensure_user("link-user", "link@example.com")
    matter = create_matter(user_id=user_id, values=MatterInput(title="linkable"))

    from sqlalchemy import text

    doc_id = str(uuid.uuid4())
    db_session.execute(
        text(
            "INSERT INTO documents (id, document_type, text, effective_from, effective_to, created_at, updated_at) "
            "VALUES (:id, 'law_article', 'stub', '1900-01-01', '9999-12-31', now(), now())"
        ),
        {"id": doc_id},
    )
    db_session.commit()

    link_document(user_id=user_id, matter_id=str(matter.id), document_id=doc_id)
    link_run(user_id=user_id, matter_id=str(matter.id), run_id="run-42", run_type="agent")

    rows = db_session.execute(
        text("SELECT document_id FROM matter_documents WHERE matter_id = :mid"),
        {"mid": matter.id},
    ).fetchall()
    assert len(rows) == 1

    run_rows = db_session.execute(
        text("SELECT run_id, run_type FROM matter_agent_runs WHERE matter_id = :mid"),
        {"mid": matter.id},
    ).fetchall()
    assert run_rows[0].run_id == "run-42"
    assert run_rows[0].run_type == "agent"


def test_save_research_note_creates_default_matter_and_preserves_citations(db_engine) -> None:
    user_id = "dev-bypass-user"

    matter, note = save_research_note(
        user_id=user_id,
        values=ResearchNoteInput(
            question="Wat geldt bij opzegging van huur van woonruimte?",
            answer="Brononderbouwd antwoord.",
            status="grounded",
            source_ids=["BWBR0005290"],
            domains=["tenancy_law"],
            citations=[
                {
                    "id": "doc-1",
                    "source_id": "BWBR0005290",
                    "source_type": "legislation",
                    "domain": "tenancy_law",
                    "title": "BW Boek 7",
                    "article": "7:271",
                    "court": None,
                    "snippet": "Opzegging huur.",
                }
            ],
        ),
    )

    assert matter.title == "Demo Matter"
    assert note["matter_id"] == str(matter.id)
    assert note["matter_title"] == "Demo Matter"
    assert note["citation_count"] == 1
    assert note["citations"][0]["source_id"] == "BWBR0005290"

    listed = list_matters(user_id=user_id)
    assert [item.title for item in listed] == ["Demo Matter"]
    research_notes = listed[0].tags["research_notes"]
    assert research_notes[0]["question"] == "Wat geldt bij opzegging van huur van woonruimte?"
    assert research_notes[0]["citations"][0]["article"] == "7:271"


def test_save_research_note_rejects_ungrounded_answers(ensure_user) -> None:
    user_id = ensure_user("research-refusal-user", "research-refusal@example.com")

    with pytest.raises(ValueError, match="Only grounded"):
        save_research_note(
            user_id=user_id,
            values=ResearchNoteInput(
                question="Kun je mijn volledige belastingaangifte doen?",
                answer="Outside current coverage.",
                status="insufficient_sources",
                source_ids=[],
                domains=[],
                citations=[],
            ),
        )


def test_create_research_memo_from_grounded_note_preserves_citations(db_engine) -> None:
    user_id = "memo-user"
    matter, note = save_research_note(
        user_id=user_id,
        values=ResearchNoteInput(
            question="Wanneer is ontslag op staande voet geldig?",
            answer="Een dringende reden en onverwijlde mededeling zijn vereist.",
            status="grounded",
            source_ids=["BWBR0005290"],
            domains=["employment_law"],
            citations=[
                {
                    "id": "doc-2",
                    "source_id": "BWBR0005290",
                    "source_type": "legislation",
                    "domain": "employment_law",
                    "title": "Burgerlijk Wetboek Boek 7",
                    "article": "7:677",
                    "court": None,
                    "snippet": "Dringende reden.",
                }
            ],
        ),
    )

    updated_matter, memo = create_research_memo(
        user_id=user_id,
        values=ResearchMemoInput(
            matter_id=str(matter.id),
            source_note_id=note["id"],
        ),
    )

    assert memo["type"] == "research_memo"
    assert memo["source_note_id"] == note["id"]
    assert memo["status"] == "draft"
    assert memo["lawyer_review_required"] is True
    assert memo["citation_count"] == 1
    assert memo["citations"][0]["article"] == "7:677"
    assert "Lawyer review required" in memo["memo_body"]
    assert updated_matter.tags["research_memos"][0]["id"] == memo["id"]


def test_create_research_memo_rejects_note_without_citations(ensure_user) -> None:
    user_id = ensure_user("memo-block-user", "memo-block@example.com")
    matter = create_matter(
        user_id=user_id,
        values=MatterInput(
            title="Memo block",
            tags={
                "research_notes": [
                    {
                        "id": "note-no-citations",
                        "type": "assistant_research_note",
                        "question": "Vraag zonder bron?",
                        "answer": "Geen bron.",
                        "status": "grounded",
                        "citations": [],
                        "citation_count": 0,
                    }
                ]
            },
        ),
    )

    with pytest.raises(ValueError, match="grounded research notes with citations"):
        create_research_memo(
            user_id=user_id,
            values=ResearchMemoInput(
                matter_id=str(matter.id),
                source_note_id="note-no-citations",
            ),
        )


def test_get_or_create_settings_initializes_defaults(ensure_user) -> None:
    user_id = ensure_user("settings-user", "settings@example.com")
    settings = get_or_create_settings(user_id)
    assert settings.theme_preference == "system"
    assert settings.language_preference == "nl"
    assert settings.bwb_enabled is True
    assert settings.openai_key_configured is False
    # Second call returns the same row without inserting a duplicate.
    again = get_or_create_settings(user_id)
    assert again.user_id == settings.user_id


def test_get_or_create_settings_creates_minimal_user_when_needed(db_engine) -> None:
    settings = get_or_create_settings("api-issued-user")

    assert settings.user_id == "api-issued-user"
    assert settings.onboarding_completed is False


def test_update_settings_respects_whitelist(ensure_user) -> None:
    user_id = ensure_user("update-settings", "update@example.com")
    updated = update_settings(
        user_id,
        {
            "display_name": "Test Gebruiker",
            "firm_name": "Gebruikers BV",
            "theme_preference": "dark",
            "language_preference": "en",
            "bwb_enabled": False,
            "openai_key_configured": True,
            "cohere_key_configured": True,
            "primary_domain": "employment_law",
            "onboarding_completed": True,
            "bogus": "should-be-ignored",
        },
    )
    assert updated.display_name == "Test Gebruiker"
    assert updated.firm_name == "Gebruikers BV"
    assert updated.theme_preference == "dark"
    assert updated.language_preference == "en"
    assert updated.bwb_enabled is False
    assert updated.openai_key_configured is False
    assert updated.cohere_key_configured is False
    assert updated.primary_domain == "employment_law"
    assert updated.onboarding_completed is True
    assert not hasattr(updated, "bogus")
