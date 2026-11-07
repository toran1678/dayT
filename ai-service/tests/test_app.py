from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

from app.api.v1.internal_ai import (
    get_course_generate_service,
    get_place_enrich_service,
)
from app.main import app
from app.services.collector_service import ExternalPlaceCollector
from app.services.course_generate_service import (
    CourseGenerateService,
    CourseSelectLlmOutput,
    SelectedStopLlmItem,
)
from app.services.place_enrich_service import PlaceEnrichLlmOutput, PlaceEnrichService

client = TestClient(app)


def _sample_candidate(
    place_id: int,
    name: str,
    category_group: str,
    lat: float,
    lng: float,
    price: int = 18000,
) -> dict[str, Any]:
    return {
        "id": place_id,
        "externalProvider": "KAKAO",
        "externalPlaceId": f"kakao-{place_id}",
        "name": name,
        "categoryGroup": category_group,
        "foodCategory": "일식" if category_group == "RESTAURANT" else None,
        "subCategory": None,
        "address": "서울 성동구 성수동2가",
        "latitude": lat,
        "longitude": lng,
        "phone": None,
        "placeUrl": f"https://place.map.kakao.com/{place_id}",
        "thumbnailUrl": None,
        "avgPricePerPerson": price,
        "isIndoor": True,
        "hashtags": ["#성수_데이트"],
        "recommendedMenus": [],
        "aiSummary": "감각적인 성수 데이트 스팟",
        "eventStartDate": None,
        "eventEndDate": None,
    }


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "UP"
    assert body["service"] == "dayt-ai-service"
    assert body["defaultModel"] == "gemini-3.8-flash"
    assert "geminiKeyConfigured" in body


def test_openapi_matches_internal_ai_camel_case_contract() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()

    paths = spec["paths"]
    assert "/internal/ai/v1/courses/generate" in paths
    assert "/internal/ai/v1/places/enrich" in paths

    schemas = spec["components"]["schemas"]
    enrich_props = schemas["InternalPlaceEnrichResponse"]["properties"]
    assert {
        "placeId",
        "hashtags",
        "recommendedMenus",
        "avgPricePerPerson",
        "isIndoor",
        "oneLineSummary",
    } <= set(enrich_props.keys())

    course_gen_props = schemas["InternalAiCourseGenerateRequest"]["properties"]
    assert {"condition", "candidatePlaces"} <= set(course_gen_props.keys())


def test_place_enrich_with_mocked_gemini() -> None:
    class FakeGemini:
        is_configured = True

        def generate_structured(self, **kwargs: Any) -> PlaceEnrichLlmOutput:
            return PlaceEnrichLlmOutput(
                hashtags=["분위기 맛집", "#디저트_추천", "#채광_맛집"],
                recommended_menus=["무화과 타르트", "핸드드립 커피"],
                avg_price_per_person=12000,
                is_indoor=True,
                one_line_summary="통창 채광과 수제 타르트가 매력적인 성수 로스터리 카페입니다.",
            )

    class StubCollector(ExternalPlaceCollector):
        async def collect_place_snippets(self, **kwargs: Any) -> list[str]:
            return ["성수동 무화과 타르트와 핸드드립이 맛있는 채광 좋은 카페 후기"]

    app.dependency_overrides[get_place_enrich_service] = lambda: PlaceEnrichService(
        gemini=FakeGemini(),  # type: ignore[arg-type]
        collector=StubCollector(),
    )
    try:
        response = client.post(
            "/internal/ai/v1/places/enrich",
            json={
                "placeId": 42,
                "name": "성수 햇살 로스터리",
                "address": "서울 성동구 연무장길 10",
                "categoryGroup": "CAFE",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["placeId"] == 42
        assert body["hashtags"] == ["#분위기_맛집", "#디저트_추천", "#채광_맛집"]
        assert body["recommendedMenus"] == ["무화과 타르트", "핸드드립 커피"]
        assert body["avgPricePerPerson"] == 12000
        assert body["isIndoor"] is True
        assert "로스터리" in body["oneLineSummary"]
    finally:
        app.dependency_overrides.clear()


def test_course_generate_filters_hallucinated_ids_and_builds_polyline() -> None:
    class FakeGemini:
        is_configured = True

        def generate_structured(self, **kwargs: Any) -> CourseSelectLlmOutput:
            # Includes hallucinated place_id=99999 which MUST be filtered out!
            return CourseSelectLlmOutput(
                suggested_title="비 오는 날 성수 아늑한 일식 & 카페 루트",
                ai_reason="실내 동선 위주로 짧은 도보 거리 내에 식사와 디저트를 연결했습니다.",
                selected_stops=[
                    SelectedStopLlmItem(
                        place_id=101,
                        estimated_cost=36000,
                        stay_minutes=70,
                        memo="오픈 직후 방문 추천",
                    ),
                    SelectedStopLlmItem(
                        place_id=99999,
                        estimated_cost=50000,
                        stay_minutes=60,
                        memo="환각 장소 (제거되어야 함)",
                    ),
                    SelectedStopLlmItem(
                        place_id=102,
                        estimated_cost=22000,
                        stay_minutes=60,
                        memo="창가 좌석 디저트 타임",
                    ),
                ],
            )

    app.dependency_overrides[get_course_generate_service] = (
        lambda: CourseGenerateService(gemini=FakeGemini())  # type: ignore[arg-type]
    )
    try:
        payload = {
            "condition": {
                "regionKeyword": "성수역",
                "themeTags": ["감성 카페", "맛집 투어"],
                "foodCategories": ["일식"],
                "budgetPerPerson": 35000,
                "timeSlot": "HALF_DAY",
                "moodKeywords": ["비 오는 날"],
            },
            "candidatePlaces": [
                _sample_candidate(101, "연무장 카츠", "RESTAURANT", 37.5445, 127.0560, 18000),
                _sample_candidate(102, "성수 햇살 로스터리", "CAFE", 37.5439, 127.0582, 11000),
            ],
        }
        response = client.post("/internal/ai/v1/courses/generate", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["suggestedTitle"] == "비 오는 날 성수 아늑한 일식 & 카페 루트"
        assert len(body["places"]) == 2
        assert [p["place"]["id"] for p in body["places"]] == [101, 102]
        assert body["places"][0]["travelMinutesToNext"] >= 1
        assert body["places"][1]["travelMinutesToNext"] == 0
        assert body["totalEstimatedCost"] == 58000
        assert len(body["routePolyline"]) == 2
    finally:
        app.dependency_overrides.clear()


def test_course_generate_empty_candidates_returns_400_error_contract() -> None:
    payload = {
        "condition": {
            "regionKeyword": "성수역",
            "themeTags": ["감성 카페"],
            "budgetPerPerson": 30000,
            "timeSlot": "HALF_DAY",
        },
        "candidatePlaces": [],
    }
    response = client.post("/internal/ai/v1/courses/generate", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "INVALID_INPUT"
    assert "timestamp" in body
