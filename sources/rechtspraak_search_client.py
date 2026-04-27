"""Official Rechtspraak Open Data search-feed client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import cast
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
)
from sources.rechtspraak_client import (
    RechtspraakClientError,
    RechtspraakTransientError,
    _respect_rate_limit,
)

LOGGER = get_logger("sources.rechtspraak_search_client")
ATOM_NS = "{http://www.w3.org/2005/Atom}"


@dataclass(frozen=True)
class RechtspraakSearchEntry:
    """One entry from the Rechtspraak Open Data Atom search feed."""

    ecli: str
    title: str
    summary: str
    updated: str | None
    url: str | None


def _search_url() -> str:
    """Derive the OpenSearch endpoint from the configured Rechtspraak content URL."""
    base_url = get_rechtspraak_base_url().rstrip("/")
    if base_url.endswith("/content"):
        return f"{base_url.rsplit('/', 1)[0]}/zoeken"
    return f"{base_url}/zoeken"


@retry(
    retry=retry_if_exception_type(RechtspraakTransientError),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
    stop=stop_after_attempt(4),
    reraise=True,
)
def _http_get_search_feed(params: dict[str, str]) -> bytes:
    """Fetch one official Rechtspraak Atom search page."""
    _respect_rate_limit()
    url = f"{_search_url()}?{parse.urlencode(params)}"
    req = request.Request(
        url,
        headers={
            "Accept": "application/atom+xml,application/xml;q=0.9,*/*;q=0.1",
            "User-Agent": get_user_agent(),
        },
    )
    LOGGER.info("Fetching Rechtspraak search URL %s", url)
    try:
        with request.urlopen(req, timeout=get_http_timeout_seconds()) as response:
            payload: bytes = cast(bytes, response.read())
            LOGGER.info(
                "Fetched Rechtspraak search URL %s status=%s bytes=%s",
                url,
                response.status,
                len(payload),
            )
            return payload
    except error.HTTPError as exc:
        if exc.code == 429 or exc.code >= 500:
            raise RechtspraakTransientError(
                f"Rechtspraak search failed for {url}: HTTP {exc.code}"
            ) from exc
        raise RechtspraakClientError(
            f"Rechtspraak search failed for {url}: HTTP {exc.code}"
        ) from exc
    except error.URLError as exc:
        raise RechtspraakTransientError(
            f"Rechtspraak search failed for {url}: {exc.reason}"
        ) from exc


def _parse_search_feed(xml_bytes: bytes) -> list[RechtspraakSearchEntry]:
    """Parse ECLI entries from one Rechtspraak Atom feed page."""
    try:
        root = ET.fromstring(xml_bytes.lstrip(b"\xef\xbb\xbf"))
    except ET.ParseError as exc:
        raise RechtspraakClientError("Malformed Rechtspraak search feed XML.") from exc

    entries: list[RechtspraakSearchEntry] = []
    for entry in root.findall(f"{ATOM_NS}entry"):
        ecli = (entry.findtext(f"{ATOM_NS}id") or "").strip()
        if not ecli:
            continue
        link = entry.find(f"{ATOM_NS}link")
        entries.append(
            RechtspraakSearchEntry(
                ecli=ecli,
                title=(entry.findtext(f"{ATOM_NS}title") or "").strip(),
                summary=(entry.findtext(f"{ATOM_NS}summary") or "").strip(),
                updated=(entry.findtext(f"{ATOM_NS}updated") or "").strip() or None,
                url=link.attrib.get("href") if link is not None else None,
            )
        )
    return entries


def _matches_keywords(
    entry: RechtspraakSearchEntry, keywords: tuple[str, ...] | None
) -> bool:
    """Return whether an entry matches all configured domain keywords."""
    if not keywords:
        return True
    haystack = f"{entry.ecli} {entry.title} {entry.summary}".lower()
    return any(keyword.lower() in haystack for keyword in keywords)


def search_judgment_entries(
    *,
    subject: str,
    limit: int,
    keywords: tuple[str, ...] | None = None,
    page_size: int = 500,
    max_pages: int = 20,
) -> list[RechtspraakSearchEntry]:
    """Search recent Rechtspraak judgments by official rechtsgebied subject URI."""
    if limit < 1:
        return []
    if page_size < 1:
        raise ValueError("page_size must be positive.")

    results: list[RechtspraakSearchEntry] = []
    seen: set[str] = set()
    offset = 0
    for _ in range(max_pages):
        feed = _http_get_search_feed(
            {
                "return": "DOC",
                "max": str(page_size),
                "from": str(offset),
                "sort": "DESC",
                "subject": subject,
            }
        )
        entries = _parse_search_feed(feed)
        if not entries:
            break
        for entry in entries:
            if entry.ecli in seen or not _matches_keywords(entry, keywords):
                continue
            seen.add(entry.ecli)
            results.append(entry)
            if len(results) >= limit:
                return results
        offset += page_size
    return results
