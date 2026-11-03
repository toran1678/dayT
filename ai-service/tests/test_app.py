from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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
    assert {"placeId", "hashtags", "recommendedMenus", "avgPricePerPerson", "isIndoor", "oneLineSummary"} <= set(
        enrich_props.keys()
    )

    course_gen_props = schemas["InternalAiCourseGenerateRequest"]["properties"]
    assert {"condition", "candidatePlaces"} <= set(course_gen_props.keys())


def test_error_response_matches_spec_contract() -> None:
    response = client.post(
        "/internal/ai/v1/places/enrich",
        json={"placeId": 1, "name": "성수 카페", "address": "서울 성동구", "categoryGroup": "CAFE"},
    )
    assert response.status_code == 501
    body = response.json()
    assert body["code"] == "NOT_IMPLEMENTED"
    assert "message" in body
    assert "timestamp" in body

