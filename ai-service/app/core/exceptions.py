from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.base import ErrorResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        body = ErrorResponse(code=exc.code, message=exc.message)
        return JSONResponse(status_code=exc.status_code, content=body.model_dump(mode="json"))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        loc = ".".join(str(part) for part in first.get("loc", []) if part != "body")
        msg = f"{loc}: {first.get('msg', '요청 파라미터가 올바르지 않습니다.')}" if loc else "요청 파라미터가 올바르지 않습니다."
        body = ErrorResponse(code="INVALID_INPUT", message=msg)
        return JSONResponse(status_code=400, content=body.model_dump(mode="json"))

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code_map = {
            400: "INVALID_INPUT",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            501: "NOT_IMPLEMENTED",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        body = ErrorResponse(code=code, message=str(exc.detail))
        return JSONResponse(status_code=exc.status_code, content=body.model_dump(mode="json"))

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled AI service error", exc_info=exc)
        body = ErrorResponse(code="INTERNAL_SERVER_ERROR", message="AI 서비스 내부 오류가 발생했습니다.")
        return JSONResponse(status_code=500, content=body.model_dump(mode="json"))

