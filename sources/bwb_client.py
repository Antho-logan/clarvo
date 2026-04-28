"""Deterministic BWB client for milestone 1 legislation ingestion."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, cast
from urllib import error, parse, request
from xml.etree import ElementTree as ET

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend_common import (
    get_bwb_base_url,
    get_http_timeout_seconds,
    get_logger,
    get_user_agent,
)

LOGGER = get_logger("sources.bwb_client")


class BWBClientError(RuntimeError):
    """Raised when a BWB fetch or manifest parse fails."""


class BWBTransientError(BWBClientError):
    """Raised for retryable BWB transport failures."""


@dataclass(frozen=True)
class _ManifestExpression:
    """Typed view of one manifest expression entry."""

    expression: str
    filename: str
    start_date: date | None
    end_date: date | None


@retry(
    retry=retry_if_exception_type(BWBTransientError),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _http_get_bytes(
    url: str, *, accept: str = "application/xml,text/xml;q=0.9,*/*;q=0.1"
) -> bytes:
    """Fetch bytes from an official source with consistent headers and logging."""
    req = request.Request(
        url,
        headers={
            "Accept": accept,
            "User-Agent": get_user_agent(),
        },
    )
    LOGGER.info("Fetching BWB URL %s", url)
    try:
        with request.urlopen(req, timeout=get_http_timeout_seconds()) as response:
            payload: bytes = cast(bytes, response.read())
            LOGGER.info(
                "Fetched BWB URL %s status=%s bytes=%s",
                url,
                response.status,
                len(payload),
            )
            return payload
    except error.HTTPError as exc:
        if exc.code == 429 or exc.code >= 500:
            raise BWBTransientError(
                f"BWB request failed for {url}: HTTP {exc.code}"
            ) from exc
        raise BWBClientError(f"BWB request failed for {url}: HTTP {exc.code}") from exc
    except error.URLError as exc:
        raise BWBTransientError(f"BWB request failed for {url}: {exc.reason}") from exc


def _parse_iso_date(value: str | None) -> date | None:
    """Parse a manifest date field when present."""
    if not value:
        return None
    return date.fromisoformat(value.strip())


def fetch_bwb_manifest(bwbr_id: str) -> bytes:
    """Fetch the official BWB manifest XML for one BWBR identifier."""
    url = f"{get_bwb_base_url()}/{parse.quote(bwbr_id)}"
    manifest_xml = _http_get_bytes(url)
    try:
        root = ET.fromstring(manifest_xml)
    except ET.ParseError as exc:
        raise BWBClientError(f"Malformed BWB manifest XML for {bwbr_id}") from exc
    if root.tag.split("}", 1)[-1] != "work":
        raise BWBClientError(f"Unexpected BWB manifest root for {bwbr_id}: {root.tag}")
    return manifest_xml


def parse_bwb_manifest(manifest_xml: bytes) -> dict[str, Any]:
    """
    Parse a BWB manifest and select the current or latest expression.

    Selection rule:
    - Prefer an expression active on today's date.
    - Otherwise use the expression with the latest start date.
    """
    try:
        root = ET.fromstring(manifest_xml)
    except ET.ParseError as exc:
        raise BWBClientError("Malformed BWB manifest XML.") from exc

    bwbr_id = root.attrib.get("label")
    expressions: list[_ManifestExpression] = []
    for expression_node in root.findall("expression"):
        expression = expression_node.attrib.get("label")
        metadata = expression_node.find("metadata")
        manifestation = expression_node.find("manifestation")
        item = manifestation.find("item") if manifestation is not None else None
        filename = item.attrib.get("label") if item is not None else None
        if not expression or not filename:
            continue

        expressions.append(
            _ManifestExpression(
                expression=expression,
                filename=filename,
                start_date=_parse_iso_date(
                    metadata.findtext("datum_inwerkingtreding")
                    if metadata is not None
                    else None
                ),
                end_date=_parse_iso_date(
                    metadata.findtext("einddatum") if metadata is not None else None
                ),
            )
        )

    if not expressions:
        raise BWBClientError("Manifest did not contain any usable expressions.")

    today = date.today()
    active_expressions = [
        item
        for item in expressions
        if item.start_date
        and item.start_date <= today
        and (item.end_date is None or today <= item.end_date)
    ]
    selected = max(
        active_expressions or expressions,
        key=lambda item: (
            item.start_date or date.min,
            item.end_date or date.max,
        ),
    )

    return {
        "bwbr_id": bwbr_id,
        "expression": selected.expression,
        "filename": selected.filename,
        "available_expressions": [
            {
                "expression": item.expression,
                "filename": item.filename,
                "start_date": item.start_date.isoformat() if item.start_date else None,
                "end_date": item.end_date.isoformat() if item.end_date else None,
            }
            for item in expressions
        ],
        "selected_start_date": (
            selected.start_date.isoformat() if selected.start_date else None
        ),
        "selected_end_date": (
            selected.end_date.isoformat() if selected.end_date else None
        ),
    }


def fetch_bwb_toestand(bwbr_id: str, expression: str, filename: str) -> bytes:
    """Fetch one official toestand XML file from the BWB repository."""
    url = f"{get_bwb_base_url()}/{parse.quote(bwbr_id)}/{parse.quote(expression)}/xml/{parse.quote(filename)}"
    toestand_xml = _http_get_bytes(url)
    try:
        root = ET.fromstring(toestand_xml)
    except ET.ParseError as exc:
        raise BWBClientError(
            f"Malformed toestand XML for {bwbr_id} expression {expression}"
        ) from exc
    if root.tag.split("}", 1)[-1] != "toestand":
        raise BWBClientError(f"Unexpected toestand root for {bwbr_id}: {root.tag}")
    return toestand_xml


def fetch_law_xml(bwbr_id: str) -> dict[str, Any]:
    """Fetch manifest and toestand XML for a single BWBR identifier."""
    manifest_xml = fetch_bwb_manifest(bwbr_id)
    manifest = parse_bwb_manifest(manifest_xml)
    toestand_xml = fetch_bwb_toestand(
        bwbr_id=bwbr_id,
        expression=manifest["expression"],
        filename=manifest["filename"],
    )
    base_url = get_bwb_base_url()
    manifest_url = f"{base_url}/{parse.quote(bwbr_id)}"
    toestand_url = (
        f"{base_url}/{parse.quote(bwbr_id)}/{parse.quote(manifest['expression'])}"
        f"/xml/{parse.quote(manifest['filename'])}"
    )
    return {
        "bwbr_id": bwbr_id,
        "manifest_xml": manifest_xml,
        "toestand_xml": toestand_xml,
        "expression": manifest["expression"],
        "filename": manifest["filename"],
        "source_urls": {
            "manifest": manifest_url,
            "toestand": toestand_url,
        },
        "manifest_metadata": manifest,
    }
