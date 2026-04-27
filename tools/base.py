from __future__ import annotations

from typing import Any, ClassVar

from pydantic import BaseModel


class BaseTool:
    """Base contract for typed agent tools."""

    name: ClassVar[str]
    description: ClassVar[str]
    input_schema: ClassVar[type[BaseModel]]

    def run(self, **kwargs: Any) -> dict:
        """Validate and execute a tool invocation."""
        payload = self.input_schema.model_validate(kwargs)
        return self._run(payload)

    def _run(self, payload: BaseModel) -> dict:
        raise NotImplementedError
