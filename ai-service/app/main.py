from __future__ import annotations

import uvicorn
from fastapi import FastAPI

from app.api.v1.internal_ai import router as internal_ai_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.gemini import GeminiClientWrapper
from app.schemas.base import CamelModel


class HealthResponse(CamelModel):
    status: str
    service: str
    default_model: str
    gemini_key_configured: bool


def create_app() -> FastAPI:
    app = FastAPI(
        title="DayT AI & Data Service",
        version="1.0.0",
        description="Spring Boot 메인 서버와 연동되는 내부 전용 데이터 수집 및 Gemini AI 추천 마이크로서비스",
    )

    register_exception_handlers(app)
    app.include_router(internal_ai_router)

    @app.get("/health", response_model=HealthResponse, tags=["Health"])
    async def health_check() -> HealthResponse:
        settings = get_settings()
        gemini = GeminiClientWrapper(settings)
        return HealthResponse(
            status="UP",
            service="dayt-ai-service",
            default_model=settings.gemini_default_model,
            gemini_key_configured=gemini.is_configured,
        )

    return app


app = create_app()


if __name__ == "__main__":
    cfg = get_settings()
    uvicorn.run("app.main:app", host="127.0.0.1", port=cfg.ai_server_port, reload=True)

