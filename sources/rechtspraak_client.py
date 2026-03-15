"""Deterministic Rechtspraak client for milestone 1 case-law ingestion."""

from __future__ import annotations

import threading
import time
from urllib import error, parse, request
from xml.etree import ElementTree as ET

from backend_common import (
    get_http_timeout_seconds,
    get_logger,
    get_rechtspraak_base_url,
    get_user_agent,
    utcnow,
)


LOGGER = get_logger("sources.rechtspraak_client")
_RATE_LIMIT_LOCK = threading.Lock()
_LAST_REQUEST_TS = 0.0
_MIN_REQUEST_INTERVAL_SECONDS = 0.1


class RechtspraakClientError(RuntimeError):
    """Raised when a Rechtspraak fetch fails."""


def _respect_rate_limit() -> None:
    """Throttle requests to the official 10 req/sec limit."""
    global _LAST_REQUEST_TS
    with _RATE_LIMIT_LOCK:
        now = time.monotonic()
        elapsed = now - _LAST_REQUEST_TS
        if elapsed < _MIN_REQUEST_INTERVAL_SECONDS:
            time.sleep(_MIN_REQUEST_INTERVAL_SECONDS - elapsed)
        _LAST_REQUEST_TS = time.monotonic()


def fetch_judgment_xml(ecli: str) -> dict:
    """Fetch one official Rechtspraak XML judgment by ECLI."""
    _respect_rate_limit()
    query = parse.urlencode({"id": ecli})
    url = f"{get_rechtspraak_base_url()}?{query}"
    req = request.Request(
        url,
        headers={
            "Accept": "application/xml,text/xml;q=0.9,*/*;q=0.1",
            "User-Agent": get_user_agent(),
        },
    )
    LOGGER.info("Fetching Rechtspraak URL %s", url)
    try:
        with request.urlopen(req, timeout=get_http_timeout_seconds()) as response:
            xml_bytes = response.read()
            LOGGER.info("Fetched Rechtspraak URL %s status=%s bytes=%s", url, response.status, len(xml_bytes))
    except error.HTTPError as exc:
        raise RechtspraakClientError(f"Rechtspraak request failed for {ecli}: HTTP {exc.code}") from exc
    except error.URLError as exc:
        raise RechtspraakClientError(f"Rechtspraak request failed for {ecli}: {exc.reason}") from exc

    try:
        ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        raise RechtspraakClientError(f"Malformed Rechtspraak XML for {ecli}") from exc

    return {
        "ecli": ecli,
        "xml": xml_bytes,
        "source_url": url,
        "fetched_at": utcnow(),
    }
