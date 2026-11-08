from __future__ import annotations

from datetime import date
from enum import Enum

from pydantic import Field

from app.schemas.base import CamelModel


class PlaceCategoryGroup(str, Enum):
    RESTAURANT = "RESTAURANT"
    CAFE = "CAFE"
    ACTIVITY = "ACTIVITY"
    EXHIBITION = "EXHIBITION"
    PARK = "PARK"
    ETC = "ETC"


class ExternalProvider(str, Enum):
    KAKAO = "KAKAO"
    NAVER = "NAVER"
    TOUR_API = "TOUR_API"


class FoodCategory(str, Enum):
    KOREAN = "한식"
    CHINESE = "중식"
    JAPANESE = "일식"
    WESTERN = "양식"
    CHICKEN = "치킨"
    MEAT = "고기"
    SNACK = "분식"
    ETC = "기타"


class DateTheme(str, Enum):
    CAFE = "감성 카페"
    FOOD_TOUR = "맛집 투어"
    ACTIVITY = "액티비티"
    EXHIBITION = "전시·문화"
    WALK = "산책·야외"
    ANYWHERE = "어디든"
    FESTIVAL = "행사·축제"


class DateTimeSlot(str, Enum):
    HALF_DAY = "HALF_DAY"
    ALL_DAY = "ALL_DAY"
    EVENING = "EVENING"


class LatLngPoint(CamelModel):
    latitude: float
    longitude: float


class PlaceDetail(CamelModel):
    id: int
    external_provider: ExternalProvider
    external_place_id: str
    name: str
    category_group: PlaceCategoryGroup
    food_category: FoodCategory | None
    sub_category: str | None
    address: str
    latitude: float
    longitude: float
    phone: str | None
    place_url: str | None
    thumbnail_url: str | None
    avg_price_per_person: int | None
    is_indoor: bool | None
    hashtags: list[str]
    recommended_menus: list[str]
    ai_summary: str | None
    event_start_date: date | None
    event_end_date: date | None


class CourseRecommendRequest(CamelModel):
    region_keyword: str
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    target_date: date | None = None
    theme_tags: list[DateTheme]
    food_categories: list[FoodCategory] = Field(default_factory=list)
    budget_per_person: int
    time_slot: DateTimeSlot
    mood_keywords: list[str] = Field(default_factory=list)


class CoursePlaceDetailItem(CamelModel):
    visit_order: int
    estimated_cost: int
    stay_minutes: int
    travel_minutes_to_next: int
    memo: str | None
    place: PlaceDetail


class CourseRecommendationPreview(CamelModel):
    suggested_title: str
    ai_reason: str
    total_estimated_cost: int
    total_duration_minutes: int
    places: list[CoursePlaceDetailItem]
    route_polyline: list[LatLngPoint]


class InternalAiCourseGenerateRequest(CamelModel):
    condition: CourseRecommendRequest
    candidate_places: list[PlaceDetail]


class InternalPlaceEnrichRequest(CamelModel):
    place_id: int
    name: str
    address: str
    category_group: PlaceCategoryGroup


class InternalPlaceEnrichResponse(CamelModel):
    place_id: int
    hashtags: list[str]
    recommended_menus: list[str]
    avg_price_per_person: int | None
    is_indoor: bool | None
    one_line_summary: str | None

