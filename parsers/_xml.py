"""Shared XML parsing helpers for Dutch legal source parsers."""

from __future__ import annotations

from typing import Iterable, Optional
from xml.etree import ElementTree as ET

from backend_common import compact_text


def local_name(tag: str) -> str:
    """Return a namespace-free lowercase XML tag name."""
    return tag.split("}", 1)[-1].lower()


def iter_nodes(node: ET.Element, local_name_value: str) -> Iterable[ET.Element]:
    """Yield descendant nodes matching the requested local name."""
    for child in node.iter():
        if local_name(child.tag) == local_name_value:
            yield child


def first_text(
    node: ET.Element | None,
    local_names: tuple[str, ...],
    *,
    startswith: str | None = None,
) -> Optional[str]:
    """Return the first normalized descendant text for one of the local names."""
    if node is None:
        return None

    wanted = set(local_names)
    for child in node.iter():
        if local_name(child.tag) not in wanted:
            continue
        value = compact_text(" ".join(child.itertext()))
        if not value:
            continue
        if startswith and not value.startswith(startswith):
            continue
        return value
    return None


def all_texts(node: ET.Element, local_name_value: str) -> list[str]:
    """Collect normalized text fragments for all matching descendant tags."""
    values: list[str] = []
    for child in iter_nodes(node, local_name_value):
        text = compact_text(" ".join(child.itertext()))
        if text:
            values.append(text)
    return values
