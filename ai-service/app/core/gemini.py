from __future__ import annotations

import copy
import logging
from typing import Any, TypeVar

from google import genai
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)
TSchema = TypeVar("TSchema", bound=BaseModel)


def _inline_json_schema_defs(schema: dict[str, Any]) -> dict[str, Any]:
    """Resolves local `$defs` references into an inline JSON Schema for Gemini `response_format`."""
    raw = copy.deepcopy(schema)
    defs: dict[str, Any] = raw.pop("$defs", {})

    def _resolve(node: Any) -> Any:
        if isinstance(node, dict):
            if "$ref" in node and isinstance(node["$ref"], str):
                ref_path = node["$ref"]
                prefix = "#/$defs/"
                if ref_path.startswith(prefix):
                    def_name = ref_path[len(prefix) :]
                    if def_name in defs:
                        return _resolve(copy.deepcopy(defs[def_name]))
            cleaned: dict[str, Any] = {}
            for k, v in node.items():
                if k == "title":
                    continue
                cleaned[k] = _resolve(v)
            return cleaned
        if isinstance(node, list):
            return [_resolve(item) for item in node]
        return node

    resolved = _resolve(raw)
    return resolved if isinstance(resolved, dict) else raw


class GeminiClientWrapper:
    """Wrapper around the official `google-genai` Interactions API (`gemini-3.8-flash`)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client: genai.Client | None = None

    @property
    def is_configured(self) -> bool:
        key = self._settings.gemini_api_key.strip()
        return bool(key) and not key.startswith("your_")

    def _get_client(self) -> genai.Client:
        if not self.is_configured:
            raise AppError(
                status_code=503,
                code="GEMINI_API_KEY_MISSING",
                message="GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.",
            )
        if self._client is None:
            self._client = genai.Client(api_key=self._settings.gemini_api_key)
        return self._client

    def generate_structured(
        self,
        *,
        prompt: str,
        schema_cls: type[TSchema],
        system_instruction: str | None = None,
        model: str | None = None,
    ) -> TSchema:
        """Runs a stateless Gemini interaction (`gemini-3.8-flash`) and validates structured JSON output."""
        client = self._get_client()
        target_model = model or self._settings.gemini_default_model
        inline_schema = _inline_json_schema_defs(
            schema_cls.model_json_schema(by_alias=True)
        )

        kwargs: dict[str, Any] = {
            "model": target_model,
            "input": prompt,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": inline_schema,
            },
            "store": False,
        }
        if system_instruction:
            kwargs["system_instruction"] = system_instruction

        interaction = client.interactions.create(**kwargs)
        if not interaction.output_text:
            raise AppError(
                status_code=502,
                code="AI_EMPTY_RESPONSE",
                message="Gemini 모델로부터 유효한 JSON 응답을 받지 못했습니다.",
            )
        return schema_cls.model_validate_json(interaction.output_text)
