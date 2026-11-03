from __future__ import annotations

from fastapi import APIRouter

from app.core.exceptions import AppError
from app.schemas.internal_ai import (
    CourseRecommendationPreview,
    InternalAiCourseGenerateRequest,
    InternalPlaceEnrichRequest,
    InternalPlaceEnrichResponse,
)

router = APIRouter(prefix="/internal/ai/v1", tags=["Internal AI"])


@router.post(
    "/courses/generate",
    response_model=CourseRecommendationPreview,
    summary="[내부 전용] 후보 장소 풀 기반 Gemini 최적 데이트 코스 조합 생성",
)
async def generate_course_recommendation(
    payload: InternalAiCourseGenerateRequest,
) -> CourseRecommendationPreview:
    raise AppError(
        status_code=501,
        code="NOT_IMPLEMENTED",
        message=f"AI 맞춤 코스 추천 파이프라인(Phase 3 F-06) 구현 예정입니다. (지역: {payload.condition.region_keyword})",
    )


@router.post(
    "/places/enrich",
    response_model=InternalPlaceEnrichResponse,
    summary="[내부 전용] 단일 장소 리뷰 수집 및 Gemini 해시태그·예상비용 정형 추출",
)
async def enrich_place_metadata(
    payload: InternalPlaceEnrichRequest,
) -> InternalPlaceEnrichResponse:
    raise AppError(
        status_code=501,
        code="NOT_IMPLEMENTED",
        message=f"장소 리뷰 수집·해시태그 추출 파이프라인(Phase 3 F-07) 구현 예정입니다. (장소: {payload.name})",
    )

