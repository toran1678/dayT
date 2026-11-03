from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base schema enforcing 1:1 camelCase JSON contract with docs/api-spec.yaml."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ErrorResponse(CamelModel):
    """Matches components.schemas.ErrorResponse in docs/api-spec.yaml."""

    code: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

