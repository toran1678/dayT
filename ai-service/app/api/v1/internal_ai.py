from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends

from app.schemas.internal_ai import (
    CourseRecommendationPreview,
    InternalAiCourseGenerateRequest,
    InternalPlaceEnrichRequest,
    InternalPlaceEnrichResponse,
)
from app.services.course_generate_service import CourseGenerateService
from app.services.place_enrich_service import PlaceEnrichService

router = APIRouter(prefix="/internal/ai/v1", tags=["Internal AI"])


@lru_cache
def get_course_generate_service() -> CourseGenerateService:
    return CourseGenerateService()


@lru_cache
def get_place_enrich_service() -> PlaceEnrichService:
    return PlaceEnrichService()


@router.post(
    "/courses/generate",
    response_model=CourseRecommendationPreview,
    summary="[내부 전용] 후보 장소 풀 기반 Gemini 최적 데이트 코스 조합 생성",
)
async def generate_course_recommendation(
    payload: InternalAiCourseGenerateRequest,
    service: CourseGenerateService = Depends(get_course_generate_service),
) -> CourseRecommendationPreview:
    return await service.generate_course(payload)


@router.post(
    "/places/enrich",
    response_model=InternalPlaceEnrichResponse,
    summary="[내부 전용] 단일 장소 리뷰 수집 및 Gemini 해시태그·예상비용 정형 추출",
)
async def enrich_place_metadata(
    payload: InternalPlaceEnrichRequest,
    service: PlaceEnrichService = Depends(get_place_enrich_service),
) -> InternalPlaceEnrichResponse:
    return await service.enrich_place(payload)
