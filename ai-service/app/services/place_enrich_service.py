from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from app.core.gemini import GeminiClientWrapper
from app.schemas.internal_ai import (
    InternalPlaceEnrichRequest,
    InternalPlaceEnrichResponse,
    PlaceCategoryGroup,
)
from app.services.collector_service import ExternalPlaceCollector

logger = logging.getLogger(__name__)


class PlaceEnrichLlmOutput(BaseModel):
    hashtags: list[str] = Field(
        description="'#'으로 시작하는 데이트 분위기·특징 해시태그 3~4개 (예: #감성_조명, #디저트_맛집)"
    )
    recommended_menus: list[str] = Field(
        description="대표 추천 메뉴 또는 관람 포인트 2~3개"
    )
    avg_price_per_person: int | None = Field(
        default=None,
        description="후기 본문에 실제 메뉴 가격·입장료 숫자가 명시된 경우에만 계산한 1인 지출 비용(원 단위). 가격 근거가 없으면 반드시 null",
    )
    is_indoor: bool = Field(description="실내 데이트 공간 여부 (실내면 true, 야외면 false)")
    one_line_summary: str = Field(
        description="커플 데이트 관점의 핵심 매력 1줄 요약 (80자 이내)"
    )


def _normalize_hashtag(tag: str) -> str:
    cleaned = tag.strip().replace(" ", "_")
    if not cleaned:
        return ""
    return cleaned if cleaned.startswith("#") else f"#{cleaned}"


def _build_heuristic_enrichment(
    payload: InternalPlaceEnrichRequest,
) -> InternalPlaceEnrichResponse:
    region = payload.address.split()[1] if len(payload.address.split()) > 1 else "서울"
    cat = payload.category_group

    if cat == PlaceCategoryGroup.CAFE:
        tags = ["#감성_카페", "#디저트_맛집", "#대화하기_좋은", f"#{region}_데이트"]
        menus = ["시그니처 필터 커피", "수제 계절 디저트"]
        price = None
        indoor = True
        summary = f"{region}에서 여유로운 대화와 커피 타임을 즐기기 좋은 감성 카페 스팟입니다."
    elif cat == PlaceCategoryGroup.RESTAURANT:
        tags = ["#분위기_맛집", "#데이트_다이닝", f"#{region}_핫플"]
        menus = ["시그니처 2인 세트", "셰프 추천 메인 요리"]
        price = None
        indoor = True
        summary = f"깔끔한 플레이팅과 아늑한 무드로 커플 식사에 잘 어울리는 {region} 다이닝 공간입니다."
    elif cat == PlaceCategoryGroup.EXHIBITION:
        tags = ["#실내_데이트", "#전시_관람", "#포토존_가득"]
        menus = ["상설·기획 전시 관람", "아트숍 굿즈 코너"]
        price = None
        indoor = True
        summary = "날씨에 구애받지 않고 감각적인 전시와 사진을 남길 수 있는 문화 공간입니다."
    elif cat == PlaceCategoryGroup.ACTIVITY:
        tags = ["#이색_체험", "#커플_클래스", "#추억_만들기"]
        menus = ["커플 원데이 체험", "기념 포토 촬영"]
        price = None
        indoor = True
        summary = "연인과 함께 직접 체험하며 특별한 추억을 쌓기 좋은 액티비티 스팟입니다."
    elif cat == PlaceCategoryGroup.PARK:
        tags = ["#산책_코스", "#노을_명소", "#야외_힐링"]
        menus = ["산책로 둘레길", "피크닉 포토 스팟"]
        price = 0
        indoor = False
        summary = f"도심 속 선선한 바람을 맞으며 나란히 걷기 좋은 {region} 산책 명소입니다."
    else:
        tags = ["#데이트_스팟", f"#{region}_추천", "#분위기_좋은"]
        menus = ["대표 인기 코스"]
        price = None
        indoor = True
        summary = f"{region} 데이트 동선에 자연스럽게 연결하기 좋은 매력적인 스팟입니다."

    return InternalPlaceEnrichResponse(
        place_id=payload.place_id,
        hashtags=tags,
        recommended_menus=menus,
        avg_price_per_person=price,
        is_indoor=indoor,
        one_line_summary=summary,
    )


class PlaceEnrichService:
    """[F-08] Enriches a place with Gemini (`gemini-3.8-flash`) structured tags & summary."""

    def __init__(
        self,
        gemini: GeminiClientWrapper | None = None,
        collector: ExternalPlaceCollector | None = None,
    ) -> None:
        self._gemini = gemini or GeminiClientWrapper()
        self._collector = collector or ExternalPlaceCollector()

    async def enrich_place(
        self, payload: InternalPlaceEnrichRequest
    ) -> InternalPlaceEnrichResponse:
        snippets = await self._collector.collect_place_snippets(
            name=payload.name,
            address=payload.address,
            category_group=payload.category_group,
        )

        if not self._gemini.is_configured:
            return _build_heuristic_enrichment(payload)

        joined_snippets = "\n".join(f"- {s}" for s in snippets)
        prompt = (
            f"장소명: {payload.name}\n"
            f"주소: {payload.address}\n"
            f"카테고리: {payload.category_group.value}\n"
            f"수집된 후기·참고 정보:\n{joined_snippets}\n\n"
            "위 정보를 바탕으로 커플 데이트 코스에 활용할 정형 메타데이터(해시태그, 추천 메뉴/포인트, "
            "1인 예상 비용, 실내 여부, 1줄 요약)를 한국어로 추출해주세요. "
            "단, 수집된 참고 정보에 구체적인 메뉴 가격이나 관람료 숫자가 없으면 avg_price_per_person은 절대 추측하지 말고 null로 반환하세요."
        )

        try:
            llm_out = self._gemini.generate_structured(
                prompt=prompt,
                schema_cls=PlaceEnrichLlmOutput,
                system_instruction=(
                    "당신은 한국 커플 데이트 큐레이터 DayT의 장소 분석 엔진입니다. "
                    "과장 없이 실용적이고 감각적인 한국어 요약을 JSON 스키마에 맞춰 반환하세요."
                ),
            )
            tags = [
                normalized
                for raw in llm_out.hashtags
                if (normalized := _normalize_hashtag(raw))
            ][:5]
            if not tags:
                tags = _build_heuristic_enrichment(payload).hashtags

            return InternalPlaceEnrichResponse(
                place_id=payload.place_id,
                hashtags=tags,
                recommended_menus=llm_out.recommended_menus[:4],
                avg_price_per_person=llm_out.avg_price_per_person,
                is_indoor=llm_out.is_indoor,
                one_line_summary=llm_out.one_line_summary.strip()[:280],
            )
        except Exception as exc:
            logger.warning(
                "Gemini place enrich failed for placeId=%s (%s); using heuristic fallback.",
                payload.place_id,
                exc,
            )
            return _build_heuristic_enrichment(payload)

