from __future__ import annotations

import logging
import math

from pydantic import BaseModel, Field

from app.core.exceptions import AppError
from app.core.gemini import GeminiClientWrapper
from app.schemas.internal_ai import (
    CoursePlaceDetailItem,
    CourseRecommendationPreview,
    CourseRecommendRequest,
    DateTheme,
    DateTimeSlot,
    InternalAiCourseGenerateRequest,
    LatLngPoint,
    PlaceCategoryGroup,
    PlaceDetail,
)

logger = logging.getLogger(__name__)

_EARTH_RADIUS_METERS = 6_371_000.0
_URBAN_DETOUR_FACTOR = 1.25
_WALKING_METERS_PER_MIN = 67.0


class SelectedStopLlmItem(BaseModel):
    place_id: int = Field(description="반드시 candidatePlaces 목록에 존재하는 후보 장소 id")
    estimated_cost: int = Field(description="2인 기준 해당 장소 예상 지출 비용(원 단위 정수)")
    stay_minutes: int = Field(description="권장 체류 시간(분 단위 정수, 보통 45~100)")
    memo: str = Field(description="해당 장소 방문 순서 팁 및 추천 포인트 (60자 이내)")


class CourseSelectLlmOutput(BaseModel):
    suggested_title: str = Field(description="감성적이고 직관적인 데이트 코스 제목 (40자 이내)")
    ai_reason: str = Field(
        description="동선 흐름·예산·분위기 측면에서 이 코스를 추천하는 이유 (150자 이내)"
    )
    selected_stops: list[SelectedStopLlmItem] = Field(
        description="방문 순서대로 정렬된 2~4개의 경유지 목록 (반드시 제공된 후보 ID만 사용)"
    )


def _estimate_walking_minutes(a: PlaceDetail, b: PlaceDetail) -> int:
    if a.id == b.id:
        return 0
    d_lat = math.radians(b.latitude - a.latitude)
    d_lon = math.radians(b.longitude - a.longitude)
    lat1 = math.radians(a.latitude)
    lat2 = math.radians(b.latitude)
    sin_val = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    )
    straight_m = 2 * _EARTH_RADIUS_METERS * math.atan2(
        math.sqrt(sin_val), math.sqrt(max(0.0, 1.0 - sin_val))
    )
    if straight_m < 15.0:
        return 1
    return max(1, round((straight_m * _URBAN_DETOUR_FACTOR) / _WALKING_METERS_PER_MIN))


def _target_stop_count(slot: DateTimeSlot, candidate_count: int) -> int:
    if slot == DateTimeSlot.ALL_DAY:
        desired = 5 if candidate_count >= 5 else 4
    elif slot == DateTimeSlot.HALF_DAY:
        desired = 3
    else:  # EVENING
        desired = 3 if candidate_count >= 3 else 2
    return max(1, min(desired, candidate_count))


def _default_stay_minutes(
    cat: PlaceCategoryGroup, slot: DateTimeSlot = DateTimeSlot.HALF_DAY
) -> int:
    if slot == DateTimeSlot.ALL_DAY:
        if cat == PlaceCategoryGroup.RESTAURANT:
            return 90
        if cat in {PlaceCategoryGroup.EXHIBITION, PlaceCategoryGroup.ACTIVITY}:
            return 110
        if cat == PlaceCategoryGroup.PARK:
            return 70
        if cat == PlaceCategoryGroup.CAFE:
            return 75
        return 60

    if slot == DateTimeSlot.EVENING:
        if cat == PlaceCategoryGroup.RESTAURANT:
            return 80
        if cat == PlaceCategoryGroup.CAFE:
            return 70
        return 60

    # HALF_DAY
    if cat == PlaceCategoryGroup.RESTAURANT:
        return 70
    if cat in {PlaceCategoryGroup.EXHIBITION, PlaceCategoryGroup.ACTIVITY}:
        return 85
    if cat == PlaceCategoryGroup.CAFE:
        return 60
    return 55


def _default_two_person_cost(place: PlaceDetail) -> int:
    if place.avg_price_per_person is not None:
        return max(0, place.avg_price_per_person * 2)
    if place.category_group == PlaceCategoryGroup.PARK:
        return 0
    if place.category_group == PlaceCategoryGroup.CAFE:
        return 18000
    return 36000


def _score_candidate(place: PlaceDetail, cond: CourseRecommendRequest) -> float:
    score = 10.0
    rainy = any(
        kw in " ".join(cond.mood_keywords) for kw in ("비", "실내", "우천", "눈", "추운")
    )
    if rainy and place.is_indoor is True:
        score += 18.0
    elif rainy and place.is_indoor is False:
        score -= 20.0

    if (
        cond.food_categories
        and place.food_category is not None
        and place.food_category in cond.food_categories
    ):
        score += 16.0

    themes = set(cond.theme_tags)
    if DateTheme.CAFE in themes and place.category_group == PlaceCategoryGroup.CAFE:
        score += 12.0
    if (
        DateTheme.FOOD_TOUR in themes
        and place.category_group == PlaceCategoryGroup.RESTAURANT
    ):
        score += 12.0
    if (
        DateTheme.EXHIBITION in themes
        and place.category_group == PlaceCategoryGroup.EXHIBITION
    ):
        score += 14.0
    if (
        DateTheme.ACTIVITY in themes
        and place.category_group == PlaceCategoryGroup.ACTIVITY
    ):
        score += 14.0
    if DateTheme.WALK in themes and place.category_group == PlaceCategoryGroup.PARK:
        score += 14.0

    if place.avg_price_per_person is not None and cond.budget_per_person > 0:
        if place.avg_price_per_person <= cond.budget_per_person:
            score += 6.0
        else:
            score -= 8.0

    return score


def _build_greedy_fallback_selection(
    cond: CourseRecommendRequest,
    candidates: list[PlaceDetail],
) -> CourseSelectLlmOutput:
    target_n = _target_stop_count(cond.time_slot, len(candidates))
    scored = sorted(
        candidates,
        key=lambda p: _score_candidate(p, cond),
        reverse=True,
    )

    # Encourage balanced flow: Restaurant -> Activity/Exhibition/Park -> Cafe
    chosen: list[PlaceDetail] = []
    used_ids: set[int] = set()

    preferred_buckets = [
        {PlaceCategoryGroup.RESTAURANT},
        {
            PlaceCategoryGroup.EXHIBITION,
            PlaceCategoryGroup.ACTIVITY,
            PlaceCategoryGroup.PARK,
        },
        {PlaceCategoryGroup.CAFE},
    ]

    for bucket in preferred_buckets:
        if len(chosen) >= target_n:
            break
        match = next(
            (p for p in scored if p.id not in used_ids and p.category_group in bucket),
            None,
        )
        if match:
            chosen.append(match)
            used_ids.add(match.id)

    for candidate in scored:
        if len(chosen) >= target_n:
            break
        if candidate.id not in used_ids:
            chosen.append(candidate)
            used_ids.add(candidate.id)

    # Nearest-neighbor spatial ordering from the first chosen anchor
    ordered: list[PlaceDetail] = [chosen[0]]
    remaining = chosen[1:]
    while remaining:
        last = ordered[-1]
        nearest = min(remaining, key=lambda nxt: _estimate_walking_minutes(last, nxt))
        ordered.append(nearest)
        remaining.remove(nearest)

    theme_str = (
        " · ".join(t.value for t in cond.theme_tags[:2])
        if cond.theme_tags
        else "맞춤 감성"
    )
    mood_prefix = f"{cond.mood_keywords[0]} " if cond.mood_keywords else ""
    title = f"{mood_prefix}{cond.region_keyword} {theme_str} 데이트 루트"[:50]
    reason = (
        f"'{cond.region_keyword}' 주변 실존 핫플 중 테마({theme_str})와 "
        f"1인 예산({cond.budget_per_person:,}원)에 맞춰 도보 이동 피로도를 최소화한 동선으로 구성했어요."
    )

    stops = [
        SelectedStopLlmItem(
            place_id=p.id,
            estimated_cost=_default_two_person_cost(p),
            stay_minutes=_default_stay_minutes(p.category_group, cond.time_slot),
            memo=p.ai_summary[:55] if p.ai_summary else f"{p.name} 시그니처 코스 즐기기",
        )
        for p in ordered
    ]

    return CourseSelectLlmOutput(
        suggested_title=title,
        ai_reason=reason,
        selected_stops=stops,
    )


def _assemble_preview(
    selection: CourseSelectLlmOutput,
    candidate_map: dict[int, PlaceDetail],
    fallback_cond: CourseRecommendRequest,
    all_candidates: list[PlaceDetail],
) -> CourseRecommendationPreview:
    # Anti-Hallucination Guard: strictly drop any place_id not present in candidate_map
    valid_stops: list[SelectedStopLlmItem] = []
    seen_ids: set[int] = set()
    for item in selection.selected_stops:
        if item.place_id in candidate_map and item.place_id not in seen_ids:
            valid_stops.append(item)
            seen_ids.add(item.place_id)

    if not valid_stops:
        fallback = _build_greedy_fallback_selection(fallback_cond, all_candidates)
        valid_stops = fallback.selected_stops
        selection = fallback

    detail_items: list[CoursePlaceDetailItem] = []
    polyline: list[LatLngPoint] = []
    total_cost = 0
    total_minutes = 0

    for idx, stop in enumerate(valid_stops):
        place = candidate_map[stop.place_id]
        is_last = idx == len(valid_stops) - 1
        next_place = (
            candidate_map[valid_stops[idx + 1].place_id] if not is_last else None
        )
        travel_mins = (
            _estimate_walking_minutes(place, next_place) if next_place else 0
        )
        cost = max(0, stop.estimated_cost)
        stay = max(20, stop.stay_minutes)

        total_cost += cost
        total_minutes += stay + travel_mins

        detail_items.append(
            CoursePlaceDetailItem(
                visit_order=idx + 1,
                estimated_cost=cost,
                stay_minutes=stay,
                travel_minutes_to_next=travel_mins,
                memo=stop.memo.strip() if stop.memo else None,
                place=place,
            )
        )
        polyline.append(
            LatLngPoint(latitude=place.latitude, longitude=place.longitude)
        )

    # Ensure total minutes match requested slot expectations (e.g. ALL_DAY: 6~8h, HALF_DAY: 3~4h)
    min_target = (
        360
        if fallback_cond.time_slot == DateTimeSlot.ALL_DAY
        else (180 if fallback_cond.time_slot == DateTimeSlot.HALF_DAY else 120)
    )
    if total_minutes < min_target and detail_items:
        deficit = min_target - total_minutes
        add_per_stop = math.ceil(deficit / len(detail_items))
        total_minutes = 0
        for item in detail_items:
            item.stay_minutes += add_per_stop
            total_minutes += item.stay_minutes + item.travel_minutes_to_next

    return CourseRecommendationPreview(
        suggested_title=selection.suggested_title.strip(),
        ai_reason=selection.ai_reason.strip(),
        total_estimated_cost=total_cost,
        total_duration_minutes=total_minutes,
        places=detail_items,
        route_polyline=polyline,
    )


class CourseGenerateService:
    """[F-06] Anti-Hallucination Gemini (`gemini-3.8-flash`) Date Course Builder."""

    def __init__(self, gemini: GeminiClientWrapper | None = None) -> None:
        self._gemini = gemini or GeminiClientWrapper()

    async def generate_course(
        self, payload: InternalAiCourseGenerateRequest
    ) -> CourseRecommendationPreview:
        candidates = payload.candidate_places
        if not candidates:
            raise AppError(
                status_code=400,
                code="INVALID_INPUT",
                message="추천 가능한 후보 장소 목록(candidatePlaces)이 비어 있습니다.",
            )

        candidate_map = {p.id: p for p in candidates}
        cond = payload.condition
        target_count = _target_stop_count(cond.time_slot, len(candidates))

        if not self._gemini.is_configured:
            fallback_sel = _build_greedy_fallback_selection(cond, candidates)
            return _assemble_preview(fallback_sel, candidate_map, cond, candidates)

        candidate_lines = []
        for p in candidates[:25]:
            if p.avg_price_per_person is not None:
                price_val = p.avg_price_per_person
                price_txt = f"1인 {price_val:,}원"
            else:
                price_val = _default_two_person_cost(p) // 2
                price_txt = f"1인 약 {price_val:,}원 (추정가)"

            indoor_txt = (
                "실내"
                if p.is_indoor is True
                else ("야외" if p.is_indoor is False else "실내외")
            )
            tags_txt = ", ".join(p.hashtags[:3])
            candidate_lines.append(
                f"- id={p.id} | {p.name} | 분류={p.category_group.value}"
                f"({p.food_category.value if p.food_category else p.sub_category or ''}) | "
                f"{indoor_txt} | {price_txt} | 좌표=({p.latitude:.5f},{p.longitude:.5f}) | 태그=[{tags_txt}]"
            )

        slot_guide = {
            DateTimeSlot.ALL_DAY: "종일 코스 (목표 총 데이트 시간: 6~8시간 / 360~480분, 권장 경유지: 4~5곳, 장소별 체류 시간: 80~120분)",
            DateTimeSlot.HALF_DAY: "반나절 코스 (목표 총 데이트 시간: 3~4시간 / 180~240분, 권장 경유지: 3곳, 장소별 체류 시간: 60~85분)",
            DateTimeSlot.EVENING: "저녁 무드 (목표 총 데이트 시간: 2~3시간 / 120~180분, 권장 경유지: 2~3곳, 장소별 체류 시간: 70~90분)",
        }.get(cond.time_slot, "맞춤 코스")

        budget_guide = (
            "예산 무관 (가격에 구애받지 않고 평점과 분위기 최고 핫플레이스 중심)"
            if cond.budget_per_person == 0
            else f"1인 하루 {cond.budget_per_person:,}원 (2인 하루 총 {cond.budget_per_person * 2:,}원 내외)"
        )
        food_req = (
            f"반드시 {', '.join(f.value for f in cond.food_categories)} 식당을 포함할 것"
            if cond.food_categories
            else "음식 메뉴 무관"
        )

        prompt = (
            f"[데이트 요청 조건]\n"
            f"- 희망 지역: {cond.region_keyword}\n"
            f"- 테마: {', '.join(t.value for t in cond.theme_tags)}\n"
            f"- 선호 음식: {food_req}\n"
            f"- 1인 하루 총 데이트 예산: {budget_guide}\n"
            f"- 시간대 및 목표 소요 시간 가이드: {slot_guide} (권장 경유지 수: {target_count}곳)\n"
            f"- 분위기 키워드: {', '.join(cond.mood_keywords) or '자연스러운 데이트'}\n\n"
            f"[검증된 실존 후보 장소 풀 (반드시 아래 id 중에서만 선택할 것)]\n"
            + "\n".join(candidate_lines)
            + "\n\n"
            f"위 후보 장소 중 동선이 겹치거나 되돌아가지 않도록 {target_count}곳을 순서대로 골라주세요.\n"
            f"1. 식당을 고를 때는 사용자의 선호 음식 조건({food_req})을 최우선으로 일치시키세요.\n"
            f"2. 각 장소의 예상 비용(estimated_cost)은 제공된 1인 가격(또는 추정가)을 기준으로 2인 총 지출 금액으로 산출하고, "
            f"전체 장소의 예상 비용 합계가 사용자의 예산({budget_guide})에 잘 맞아떨어지도록 메뉴/주문 수준을 고려해 합리적으로 작성하세요.\n"
            f"3. 선택한 시간대 가이드({slot_guide})의 목표 총 소요 시간 범위에 정확히 부합하도록 각 장소의 권장 체류 시간(stay_minutes)을 넉넉하고 현실감 있게 배정하세요. 목록에 없는 place_id는 절대 생성하지 마세요."
        )

        try:
            llm_selection = self._gemini.generate_structured(
                prompt=prompt,
                schema_cls=CourseSelectLlmOutput,
                system_instruction=(
                    "당신은 한국 커플 데이트 동선 설계 전문가 DayT AI입니다. "
                    "반드시 입력된 후보 장소(candidatePlaces)의 id만 사용하여 식당·문화/산책·카페 흐름이 "
                    "자연스럽고 도보 이동이 짧은 코스를 구성하세요."
                ),
            )
            return _assemble_preview(llm_selection, candidate_map, cond, candidates)
        except Exception as exc:
            logger.warning(
                "Gemini course generation failed for region=%s (%s); using spatial fallback.",
                cond.region_keyword,
                exc,
            )
            fallback_sel = _build_greedy_fallback_selection(cond, candidates)
            return _assemble_preview(fallback_sel, candidate_map, cond, candidates)

