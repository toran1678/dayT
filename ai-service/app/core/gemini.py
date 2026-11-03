from __future__ import annotations

import logging
from typing import TypeVar

from google import genai
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)
TSchema = TypeVar("TSchema", bound=BaseModel)


class GeminiClientWrapper:
    """Wrapper around the official `google-genai` Interactions API (`gemini-3.8-flash`)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client: genai.Client | None = None

    @property
    def is_configured(self) -> bool:
        key = self._settings.gemini_api_key.strip()
        return bool(key) and key != "your_gemini_api_key"

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
        """Runs a stateless Gemini interaction and validates structured JSON output."""
        client = self._get_client()
        target_model = model or self._settings.gemini_default_model

        kwargs: dict = {
            "model": target_model,
            "input": prompt,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": schema_cls.model_json_schema(by_alias=True),
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

