import type { components, paths } from "@/shared/types/api";

export type { components, paths };

export type Schemas = components["schemas"];

export type ErrorResponse = Schemas["ErrorResponse"];
export type OAuthProvider = Schemas["OAuthProvider"];
export type PlaceCategoryGroup = Schemas["PlaceCategoryGroup"];
export type FoodCategory = Schemas["FoodCategory"];
export type DateTheme = Schemas["DateTheme"];
export type DateTimeSlot = Schemas["DateTimeSlot"];
export type CourseSourceType = Schemas["CourseSourceType"];
export type CoupleStatus = Schemas["CoupleStatus"];

export type OAuthLoginRequest = Schemas["OAuthLoginRequest"];
export type TokenRefreshRequest = Schemas["TokenRefreshRequest"];
export type AuthTokenResponse = Schemas["AuthTokenResponse"];
export type UserSummary = Schemas["UserSummary"];
export type UserUpdateRequest = Schemas["UserUpdateRequest"];
export type CoupleInviteResponse = Schemas["CoupleInviteResponse"];
export type CoupleConnectRequest = Schemas["CoupleConnectRequest"];
export type CoupleSummary = Schemas["CoupleSummary"];

export type PlaceDetail = Schemas["PlaceDetail"];
export type PlaceSearchListResponse = Schemas["PlaceSearchListResponse"];
export type FoodRecommendationResponse = Schemas["FoodRecommendationResponse"];

export type CoursePlaceRequestItem = Schemas["CoursePlaceRequestItem"];
export type CourseUpsertRequest = Schemas["CourseUpsertRequest"];
export type CoursePlaceDetailItem = Schemas["CoursePlaceDetailItem"];
export type CourseListItem = Schemas["CourseListItem"];
export type CourseDetail = Schemas["CourseDetail"];
export type CourseRecommendRequest = Schemas["CourseRecommendRequest"];
export type CourseRecommendationPreview = Schemas["CourseRecommendationPreview"];
export type GoogleMapsLinkResponse = Schemas["GoogleMapsLinkResponse"];
export type LatLngPoint = Schemas["LatLngPoint"];

export type CouplePetResponse = Schemas["CouplePetResponse"];
export type DailyMissionItem = Schemas["DailyMissionItem"];
export type DiaryUpsertRequest = Schemas["DiaryUpsertRequest"];
export type DiaryDetail = Schemas["DiaryDetail"];

