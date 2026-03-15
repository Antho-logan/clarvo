"""
Modular workflow engine for legal-domain automation.

This module includes:
1. A generic `Workflow` class.
2. A `WorkflowRegistry` for lookup by name/domain.
3. Example workflows for tenancy law and bezwaar preparation.
4. A CLI that runs a chosen workflow and prints JSON output.

Environment variables:
- DATABASE_URL
- OPENAI_API_KEY
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from typing import Any, Callable

from backend_common import SearchHit, compact_text, get_logger, get_session_factory, load_documents_by_ids
from agentic_orchestrator import chat
from search import hybrid_search


LOGGER = get_logger("workflow_engine")
StepCallable = Callable[[dict[str, Any]], dict[str, Any]]


@dataclass
class Workflow:
    """A workflow is a named ordered list of step callables."""

    name: str
    domain: str
    steps: list[StepCallable] = field(default_factory=list)

    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute workflow steps in order, updating the shared payload."""
        state = dict(payload)
        state.setdefault("logs", [])

        for step in self.steps:
            LOGGER.info("Running workflow=%s step=%s", self.name, step.__name__)
            state["logs"].append({"step": step.__name__, "status": "started"})
            state = step(state)
            state["logs"].append({"step": step.__name__, "status": "completed"})

        return state


class WorkflowRegistry:
    """Registry for discovering workflows by name."""

    def __init__(self) -> None:
        self._workflows: dict[str, Workflow] = {}

    def register(self, workflow: Workflow) -> None:
        """Register a workflow instance."""
        self._workflows[workflow.name] = workflow

    def get(self, name: str) -> Workflow:
        """Fetch a workflow by name."""
        if name not in self._workflows:
            available = ", ".join(sorted(self._workflows))
            raise KeyError(f"Workflow '{name}' is not registered. Available: {available}")
        return self._workflows[name]

    def list(self) -> list[Workflow]:
        """List all registered workflows."""
        return list(self._workflows.values())


def _fetch_documents_from_payload(state: dict[str, Any]) -> list[dict]:
    """Load documents either by explicit IDs or via a default legal query."""
    if state.get("document_ids"):
        with get_session_factory()() as session:
            documents = load_documents_by_ids(session, state["document_ids"])
            return [document.as_dict() for document in documents]

    query = state.get("default_query", "")
    return [hit.as_dict() for hit in hybrid_search(query, k_bm25=5, k_vector=5)]


def huurcontract_query_step(state: dict[str, Any]) -> dict[str, Any]:
    """Find candidate tenancy-law documents from the vault or document store."""
    state["default_query"] = "huurcontract servicekosten huurverhoging ROZ indexatie"
    state["retrieved_documents"] = _fetch_documents_from_payload(state)
    return state


def huurcontract_clause_analysis_step(state: dict[str, Any]) -> dict[str, Any]:
    """Perform a simple heuristic clause scan over the retrieved documents."""
    keywords = {
        "service_charge_mentions": ["servicekosten", "service charge"],
        "rent_increase_mentions": ["huurverhoging", "indexatie", "cpi"],
    }
    analysis: dict[str, list[str]] = {key: [] for key in keywords}

    for document in state.get("retrieved_documents", []):
        lowered = compact_text(document.get("text", "")).lower()
        label = document.get("article") or document.get("id")
        for analysis_key, terms in keywords.items():
            if any(term in lowered for term in terms):
                analysis[analysis_key].append(str(label))

    state["clause_analysis"] = analysis
    return state


def huurcontract_agent_step(state: dict[str, Any]) -> dict[str, Any]:
    """Ask the legal agent for the most relevant tenancy-law provisions."""
    question = (
        "Which Dutch tenancy law articles are most relevant for service charges, "
        "rent increases, and lease notice periods in a commercial huurcontract?"
    )
    state["agent_result"] = chat(question)
    return state


def huurcontract_report_step(state: dict[str, Any]) -> dict[str, Any]:
    """Assemble the final tenancy workflow report."""
    state["report"] = {
        "workflow": "huurcontract_review_workflow",
        "client_id": state.get("client_id"),
        "document_count": len(state.get("retrieved_documents", [])),
        "clause_analysis": state.get("clause_analysis", {}),
        "agent_answer": state.get("agent_result", {}).get("answer"),
        "agent_sources": state.get("agent_result", {}).get("source_ids", []),
    }
    return state


def bezwaar_parse_decision_step(state: dict[str, Any]) -> dict[str, Any]:
    """Load and lightly parse an administrative decision document."""
    state["default_query"] = "besluit bezwaar termijn Awb besluit bekendmaking"
    documents = _fetch_documents_from_payload(state)
    state["retrieved_documents"] = documents
    state["decision_text"] = "\n\n".join(document["text"] for document in documents[:3])
    return state


def bezwaar_deadline_step(state: dict[str, Any]) -> dict[str, Any]:
    """Extract obvious bezwaar deadline indicators from the text."""
    text_blob = compact_text(state.get("decision_text", ""))
    date_matches = re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text_blob)
    six_week_signal = "zes weken" in text_blob.lower() or "6 weken" in text_blob.lower()
    state["deadline_analysis"] = {
        "detected_dates": date_matches,
        "mentions_six_weeks": six_week_signal,
    }
    return state


def bezwaar_agent_step(state: dict[str, Any]) -> dict[str, Any]:
    """Ask the legal agent for bezwaar deadlines and supporting Awb articles."""
    question = (
        "Which Awb articles determine the bezwaar deadline after an administrative "
        "decision is issued, and how should the deadline be calculated?"
    )
    state["agent_result"] = chat(question)
    return state


def bezwaar_report_step(state: dict[str, Any]) -> dict[str, Any]:
    """Assemble the bezwaar preparation report."""
    state["report"] = {
        "workflow": "bezwaarvoorbereiding_workflow",
        "client_id": state.get("client_id"),
        "document_count": len(state.get("retrieved_documents", [])),
        "deadline_analysis": state.get("deadline_analysis", {}),
        "agent_answer": state.get("agent_result", {}).get("answer"),
        "agent_sources": state.get("agent_result", {}).get("source_ids", []),
    }
    return state


def build_registry() -> WorkflowRegistry:
    """Register and return the default workflow catalog."""
    registry = WorkflowRegistry()
    registry.register(
        Workflow(
            name="huurcontract_review_workflow",
            domain="tenancy_law",
            steps=[
                huurcontract_query_step,
                huurcontract_clause_analysis_step,
                huurcontract_agent_step,
                huurcontract_report_step,
            ],
        )
    )
    registry.register(
        Workflow(
            name="bezwaarvoorbereiding_workflow",
            domain="administrative_law",
            steps=[
                bezwaar_parse_decision_step,
                bezwaar_deadline_step,
                bezwaar_agent_step,
                bezwaar_report_step,
            ],
        )
    )
    return registry


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments for workflow execution."""
    parser = argparse.ArgumentParser(description="Run a legal workflow and print JSON output.")
    parser.add_argument("workflow_name", help="Registered workflow name to execute.")
    parser.add_argument("--client-id", default=None, help="Optional client identifier.")
    parser.add_argument(
        "--document-ids",
        nargs="*",
        default=None,
        help="Optional explicit document UUIDs to feed into the workflow.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    registry = build_registry()
    workflow = registry.get(args.workflow_name)
    result = workflow.run(
        {
            "client_id": args.client_id,
            "document_ids": args.document_ids,
        }
    )
    print(json.dumps(result["report"], indent=2, ensure_ascii=False))
