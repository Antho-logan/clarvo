from __future__ import annotations

from io import BytesIO

import pytest

from services.document_text_extraction import (
    UnsupportedDocumentError,
    extract_document_text,
)


def test_extracts_pdf_text() -> None:
    fitz = pytest.importorskip("fitz")

    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Contractuele opzegtermijn twee maanden.")
    payload = document.tobytes()
    document.close()

    result = extract_document_text("huurcontract.pdf", "application/pdf", payload)

    assert result.name == "huurcontract.pdf"
    assert "Contractuele opzegtermijn twee maanden" in result.text
    assert result.truncated is False


def test_extracts_docx_text() -> None:
    docx = pytest.importorskip("docx")

    document = docx.Document()
    document.add_paragraph("Artikel 4. De huurder zegt schriftelijk op.")
    buffer = BytesIO()
    document.save(buffer)

    result = extract_document_text(
        "huurcontract.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer.getvalue(),
    )

    assert result.name == "huurcontract.docx"
    assert "De huurder zegt schriftelijk op" in result.text


def test_extracts_plain_text() -> None:
    result = extract_document_text(
        "contract.txt",
        "text/plain",
        "Eerste regel.\nTweede regel.".encode(),
    )

    assert result.text == "Eerste regel.\nTweede regel."


def test_rejects_unsupported_binary_type() -> None:
    with pytest.raises(UnsupportedDocumentError):
        extract_document_text("contract.doc", "application/msword", b"binary")
