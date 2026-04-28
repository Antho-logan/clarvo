"""Deterministic Rechtspraak client for milestone 1 case-law ingestion."""

from __future__ import annotations

import threading
import time
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


class RechtspraakTransientError(RechtspraakClientError):
    """Raised for retryable Rechtspraak transport failures."""


def _respect_rate_limit() -> None:
    """Throttle requests to the official 10 req/sec limit."""
    global _LAST_REQUEST_TS
    with _RATE_LIMIT_LOCK:
        now = time.monotonic()
        elapsed = now - _LAST_REQUEST_TS
        if elapsed < _MIN_REQUEST_INTERVAL_SECONDS:
            time.sleep(_MIN_REQUEST_INTERVAL_SECONDS - elapsed)
        _LAST_REQUEST_TS = time.monotonic()


@retry(
    retry=retry_if_exception_type(RechtspraakTransientError),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _http_get_judgment_bytes(ecli: str) -> tuple[str, bytes]:
    """Fetch one Rechtspraak XML response with retry for transient failures."""
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
            xml_bytes: bytes = cast(bytes, response.read())
            LOGGER.info(
                "Fetched Rechtspraak URL %s status=%s bytes=%s",
                url,
                response.status,
                len(xml_bytes),
            )
    except error.HTTPError as exc:
        if exc.code == 429 or exc.code >= 500:
            raise RechtspraakTransientError(
                f"Rechtspraak request failed for {ecli}: HTTP {exc.code}"
            ) from exc
        raise RechtspraakClientError(
            f"Rechtspraak request failed for {ecli}: HTTP {exc.code}"
        ) from exc
    except error.URLError as exc:
        raise RechtspraakTransientError(
            f"Rechtspraak request failed for {ecli}: {exc.reason}"
        ) from exc
    return url, xml_bytes


def fetch_judgment_xml(ecli: str) -> dict[str, Any]:
    """Fetch one official Rechtspraak XML judgment by ECLI."""
    url, xml_bytes = _http_get_judgment_bytes(ecli)

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
