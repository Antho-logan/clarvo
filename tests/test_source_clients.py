"""Tests for BWB and Rechtspraak source clients (with mocked HTTP)."""

from __future__ import annotations

import io
from datetime import date
from urllib import error as urllib_error

import pytest

from sources import bwb_client, rechtspraak_client
from sources.bwb_client import (
    BWBClientError,
    BWBTransientError,
    fetch_bwb_manifest,
    fetch_bwb_toestand,
    fetch_law_xml,
    parse_bwb_manifest,
)
from sources.rechtspraak_client import (
    RechtspraakClientError,
    RechtspraakTransientError,
    fetch_judgment_xml,
)


MANIFEST_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<work label="BWBR0001000">
  <expression label="2020-01-01">
    <metadata>
      <datum_inwerkingtreding>2020-01-01</datum_inwerkingtreding>
      <einddatum>2023-12-31</einddatum>
    </metadata>
    <manifestation>
      <item label="BWBR0001000-2020.xml"/>
    </manifestation>
  </expression>
  <expression label="2024-01-01">
    <metadata>
      <datum_inwerkingtreding>2024-01-01</datum_inwerkingtreding>
    </metadata>
    <manifestation>
      <item label="BWBR0001000-2024.xml"/>
    </manifestation>
  </expression>
</work>
"""


TOESTAND_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<toestand xmlns="http://schemas.overheid.nl/wetgeving">
  <intitule>Testwet</intitule>
</toestand>
"""


JUDGMENT_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcterms="http://purl.org/dc/terms/">
  <rdf:Description>
    <dcterms:identifier>ECLI:NL:HR:2024:10</dcterms:identifier>
    <dcterms:creator>Hoge Raad</dcterms:creator>
  </rdf:Description>
</rdf:RDF>
"""


class _FakeResponse:
    """Minimal urlopen response used by mocked HTTP paths."""

    def __init__(self, payload: bytes, status: int = 200) -> None:
        self._body = io.BytesIO(payload)
        self.status = status

    def read(self) -> bytes:
        return self._body.read()

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *_: object) -> None:
        self._body.close()


def _stub_urlopen(monkeypatch: pytest.MonkeyPatch, module, payload: bytes) -> list[str]:
    """Patch urlopen inside a given client module and return captured URLs."""
    captured: list[str] = []

    def fake_urlopen(req, timeout=None):
        captured.append(req.full_url)
        return _FakeResponse(payload)

    monkeypatch.setattr(module.request, "urlopen", fake_urlopen)
    return captured


def test_parse_bwb_manifest_prefers_active_expression() -> None:
    manifest = parse_bwb_manifest(MANIFEST_XML)
    assert manifest["bwbr_id"] == "BWBR0001000"
    assert manifest["expression"] == "2024-01-01"
    assert manifest["filename"] == "BWBR0001000-2024.xml"
    assert manifest["selected_start_date"] == "2024-01-01"
    assert manifest["selected_end_date"] is None
    assert len(manifest["available_expressions"]) == 2


def test_parse_bwb_manifest_raises_when_malformed() -> None:
    with pytest.raises(BWBClientError):
        parse_bwb_manifest(b"<not-xml")


def test_parse_bwb_manifest_raises_without_expressions() -> None:
    empty = b"<?xml version=\"1.0\"?><work label=\"BWBR0000000\"/>"
    with pytest.raises(BWBClientError):
        parse_bwb_manifest(empty)


def test_fetch_bwb_manifest_returns_bytes(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _stub_urlopen(monkeypatch, bwb_client, MANIFEST_XML)
    xml_bytes = fetch_bwb_manifest("BWBR0001000")
    assert xml_bytes == MANIFEST_XML
    assert captured
    assert "BWBR0001000" in captured[0]


def test_fetch_bwb_manifest_raises_on_wrong_root(monkeypatch: pytest.MonkeyPatch) -> None:
    bad_root = b"<?xml version=\"1.0\"?><wrong/>"
    _stub_urlopen(monkeypatch, bwb_client, bad_root)
    with pytest.raises(BWBClientError):
        fetch_bwb_manifest("BWBR0002000")


def test_fetch_bwb_manifest_raises_on_malformed_xml(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_urlopen(monkeypatch, bwb_client, b"<not-xml")
    with pytest.raises(BWBClientError):
        fetch_bwb_manifest("BWBR0003000")


def test_fetch_bwb_toestand_raises_on_wrong_root(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_urlopen(monkeypatch, bwb_client, b"<?xml version=\"1.0\"?><wrong/>")
    with pytest.raises(BWBClientError):
        fetch_bwb_toestand("BWBR0004000", "2024-01-01", "file.xml")


def test_fetch_bwb_toestand_returns_bytes(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_urlopen(monkeypatch, bwb_client, TOESTAND_XML)
    payload = fetch_bwb_toestand("BWBR0005000", "2024-01-01", "file.xml")
    assert payload == TOESTAND_XML


def test_fetch_law_xml_stitches_manifest_and_toestand(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [MANIFEST_XML, TOESTAND_XML]

    def fake_urlopen(req, timeout=None):
        return _FakeResponse(responses.pop(0))

    monkeypatch.setattr(bwb_client.request, "urlopen", fake_urlopen)
    result = fetch_law_xml("BWBR0001000")
    assert result["bwbr_id"] == "BWBR0001000"
    assert result["manifest_xml"] == MANIFEST_XML
    assert result["toestand_xml"] == TOESTAND_XML
    assert "manifest" in result["source_urls"]
    assert "toestand" in result["source_urls"]


def test_bwb_http_retries_on_transient_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """An HTTP 500 should be treated as transient and retried."""
    attempts = {"count": 0}

    def flaky_urlopen(req, timeout=None):
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise urllib_error.HTTPError(req.full_url, 500, "boom", None, None)
        return _FakeResponse(MANIFEST_XML)

    monkeypatch.setattr(bwb_client.request, "urlopen", flaky_urlopen)
    payload = fetch_bwb_manifest("BWBR0006000")
    assert payload == MANIFEST_XML
    assert attempts["count"] == 2


def test_bwb_http_raises_permanent_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_urlopen(req, timeout=None):
        raise urllib_error.HTTPError(req.full_url, 404, "nope", None, None)

    monkeypatch.setattr(bwb_client.request, "urlopen", fail_urlopen)
    with pytest.raises(BWBClientError):
        fetch_bwb_manifest("BWBR0007000")


def test_bwb_http_wraps_url_error_as_transient(monkeypatch: pytest.MonkeyPatch) -> None:
    def dns_fail(req, timeout=None):
        raise urllib_error.URLError("no dns")

    monkeypatch.setattr(bwb_client.request, "urlopen", dns_fail)
    with pytest.raises(BWBTransientError):
        # Bypass retry by calling the inner helper directly via unwrap.
        bwb_client._http_get_bytes.retry.wait = lambda *_, **__: 0
        bwb_client._http_get_bytes("http://example")


def test_fetch_judgment_xml_returns_parsed_envelope(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_urlopen(monkeypatch, rechtspraak_client, JUDGMENT_XML)
    result = fetch_judgment_xml("ECLI:NL:HR:2024:10")
    assert result["ecli"] == "ECLI:NL:HR:2024:10"
    assert result["xml"] == JUDGMENT_XML
    assert result["source_url"].startswith("http")


def test_fetch_judgment_xml_raises_on_malformed_xml(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_urlopen(monkeypatch, rechtspraak_client, b"<not-xml")
    with pytest.raises(RechtspraakClientError):
        fetch_judgment_xml("ECLI:NL:HR:2024:11")


def test_rechtspraak_http_raises_permanent_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_urlopen(req, timeout=None):
        raise urllib_error.HTTPError(req.full_url, 403, "forbidden", None, None)

    monkeypatch.setattr(rechtspraak_client.request, "urlopen", fail_urlopen)
    with pytest.raises(RechtspraakClientError):
        fetch_judgment_xml("ECLI:NL:HR:2024:12")


def test_rechtspraak_http_wraps_url_error_as_transient(monkeypatch: pytest.MonkeyPatch) -> None:
    def dns_fail(req, timeout=None):
        raise urllib_error.URLError("connection reset")

    monkeypatch.setattr(rechtspraak_client.request, "urlopen", dns_fail)
    rechtspraak_client._http_get_judgment_bytes.retry.wait = lambda *_, **__: 0
    with pytest.raises(RechtspraakTransientError):
        rechtspraak_client._http_get_judgment_bytes("ECLI:NL:HR:2024:13")


def test_parse_bwb_manifest_selects_latest_start_when_no_active() -> None:
    """When no expression covers today, the manifest helper selects the latest start date."""
    xml = b"""<?xml version="1.0"?>
<work label="BWBR0099">
  <expression label="1999-01-01">
    <metadata>
      <datum_inwerkingtreding>1999-01-01</datum_inwerkingtreding>
      <einddatum>1999-12-31</einddatum>
    </metadata>
    <manifestation><item label="old.xml"/></manifestation>
  </expression>
  <expression label="1990-01-01">
    <metadata>
      <datum_inwerkingtreding>1990-01-01</datum_inwerkingtreding>
      <einddatum>1990-12-31</einddatum>
    </metadata>
    <manifestation><item label="older.xml"/></manifestation>
  </expression>
</work>
"""
    manifest = parse_bwb_manifest(xml)
    assert manifest["expression"] == "1999-01-01"
    assert manifest["filename"] == "old.xml"
