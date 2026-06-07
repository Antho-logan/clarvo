"""Seed deterministic documents for the milestone-2 retrieval eval."""

from __future__ import annotations

import sys
import uuid
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import delete  # noqa: E402

from backend_common import Document, get_session_factory  # noqa: E402

EVAL_SOURCE_SYSTEM = "eval_fixture"
EFFECTIVE_FROM = date(1900, 1, 1)
EFFECTIVE_TO = date(9999, 12, 31)


def _law(
    *,
    source_id: str,
    domain: str,
    title: str,
    article: str,
    body: str,
) -> Document:
    return Document(
        id=uuid.uuid4(),
        document_type="law_article",
        source_type="legislation",
        source_system=EVAL_SOURCE_SYSTEM,
        source_id=source_id,
        domain=domain,
        bwbr_id=source_id,
        title=title,
        article=article,
        effective_from=EFFECTIVE_FROM,
        effective_to=EFFECTIVE_TO,
        text=body,
    )


def _judgment(
    *,
    ecli: str,
    domain: str,
    title: str,
    court: str,
    decision_date: date,
    body: str,
) -> Document:
    return Document(
        id=uuid.uuid4(),
        document_type="judgment",
        source_type="case_law",
        source_system=EVAL_SOURCE_SYSTEM,
        source_id=ecli,
        domain=domain,
        ecli=ecli,
        title=title,
        court=court,
        decision_date=decision_date,
        effective_from=decision_date,
        effective_to=EFFECTIVE_TO,
        text=body,
    )


def milestone2_documents() -> list[Document]:
    """Return the local documents required by evals/tests_milestone2.json."""
    return [
        _law(
            source_id="BWBR0005290",
            domain="tenancy_law",
            title="Burgerlijk Wetboek Boek 7 - huur woonruimte en opzegging",
            article="7:271",
            body=(
                "Wat geldt bij opzegging van huur van woonruimte. Huur woonruimte "
                "en opzegging. De verhuurder moet de opzegging van huur van "
                "woonruimte zorgvuldig motiveren. De huurder behoudt "
                "huurbescherming zolang de wettelijke procedure niet is afgerond."
            ),
        ),
        _law(
            source_id="BWBR0014315",
            domain="tenancy_law",
            title="Uitvoeringswet huurprijzen woonruimte",
            article="4",
            body=(
                "Regels over huur woonruimte, huurprijs en bescherming van de "
                "huurder bij geschillen over de woonruimte."
            ),
        ),
        _judgment(
            ecli="ECLI:NL:GHAMS:2025:614",
            domain="tenancy_law",
            title="ECLI:NL:GHAMS:2025:614 - huur woonruimte",
            court="Gerechtshof Amsterdam",
            decision_date=date(2025, 3, 4),
            body=(
                "ECLI:NL:GHAMS:2025:614. In deze zaak stond huur van woonruimte "
                "en de opzegging van de huurovereenkomst centraal."
            ),
        ),
        _law(
            source_id="BWBR0002638",
            domain="employment_law",
            title="Wet minimumloon en minimumvakantiebijslag",
            article="7",
            body=(
                "Minimumloon vakantiebijslag arbeid. De werknemer heeft aanspraak "
                "op minimumloon en minimumvakantiebijslag volgens de wettelijke norm."
            ),
        ),
        _law(
            source_id="BWBR0002747",
            domain="employment_law",
            title="Burgerlijk Wetboek Boek 7 - arbeidsovereenkomst",
            article="7:677",
            body=(
                "Arbeid en ontslag op staande voet. Bij ontslag op staande voet "
                "zijn onverwijldheid, een dringende reden en mededeling van die "
                "reden belangrijke aandachtspunten."
            ),
        ),
        _judgment(
            ecli="ECLI:NL:RBROT:2022:5820",
            domain="employment_law",
            title="ECLI:NL:RBROT:2022:5820 - arbeidsrecht",
            court="Rechtbank Rotterdam",
            decision_date=date(2022, 7, 8),
            body=(
                "ECLI:NL:RBROT:2022:5820. De kantonrechter beoordeelde arbeid, "
                "loon en de omstandigheden rond ontslag in een arbeidsrechtelijk geschil."
            ),
        ),
        _law(
            source_id="BWBR0005537",
            domain="administrative_law",
            title="Algemene wet bestuursrecht - bezwaar",
            article="6:4",
            body=(
                "Algemene wet bestuursrecht bezwaar. Een belanghebbende kan bezwaar "
                "maken tegen een besluit volgens de regels van de Awb."
            ),
        ),
        _judgment(
            ecli="ECLI:NL:RVS:2023:2978",
            domain="administrative_law",
            title="ECLI:NL:RVS:2023:2978 - bestuursrecht bezwaar",
            court="Raad van State",
            decision_date=date(2023, 8, 2),
            body=(
                "ECLI:NL:RVS:2023:2978. De Afdeling bestuursrechtspraak behandelde "
                "bezwaar, besluitvorming en de eisen van de Algemene wet bestuursrecht."
            ),
        ),
    ]


def seed_eval_database() -> int:
    """Refresh milestone-2 eval fixture rows and return the inserted count."""
    session_factory = get_session_factory()
    documents = milestone2_documents()
    with session_factory() as session:
        session.execute(
            delete(Document).where(Document.source_system == EVAL_SOURCE_SYSTEM)
        )
        session.add_all(documents)
        session.commit()
    return len(documents)


def main() -> int:
    count = seed_eval_database()
    print(f"seeded milestone2 eval documents={count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
