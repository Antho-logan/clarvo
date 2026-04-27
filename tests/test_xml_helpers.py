from xml.etree import ElementTree as ET

from parsers._xml import all_texts, first_text, iter_nodes, local_name


def test_xml_helpers_ignore_namespaces() -> None:
    root = ET.fromstring(
        """
        <root xmlns="urn:test">
          <artikel>
            <kop><nr>7:271</nr></kop>
            <al> eerste tekst </al>
            <al>tweede tekst</al>
          </artikel>
        </root>
        """
    )

    article = next(iter_nodes(root, "artikel"))

    assert local_name(article.tag) == "artikel"
    assert first_text(article, ("nr",)) == "7:271"
    assert all_texts(article, "al") == ["eerste tekst", "tweede tekst"]
