from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVICE_DIR = Path(__file__).resolve().parents[2]
_ROOT_ENV = _SERVICE_DIR.parent / ".env"
_LOCAL_ENV = _SERVICE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_ROOT_ENV), str(_LOCAL_ENV)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_server_port: int = 8000
    gemini_api_key: str = ""
    gemini_default_model: str = "gemini-3.8-flash"

    naver_client_id: str = ""
    naver_client_secret: str = ""
    tour_api_service_key: str = ""
    google_places_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

