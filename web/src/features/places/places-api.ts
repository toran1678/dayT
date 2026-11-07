import { apiFetch } from "@/shared/api/client";
import type {
  FoodCategory,
  FoodRecommendationResponse,
  PlaceCategoryGroup,
  PlaceDetail,
  PlaceSearchListResponse,
} from "@/shared/api/types";

export interface PlaceSearchQueryParams {
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  categoryGroup?: PlaceCategoryGroup;
  foodCategory?: FoodCategory;
  maxPricePerPerson?: number;
  isIndoor?: boolean;
  page?: number;
  size?: number;
}

export interface FoodRecommendQueryParams {
  foodCategory?: FoodCategory;
  latitude?: number;
  longitude?: number;
  budgetPerPerson?: number;
}

function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : "";
}

export function searchPlacesApi(
  params: PlaceSearchQueryParams,
): Promise<PlaceSearchListResponse> {
  const qs = buildQueryString({
    keyword: params.keyword?.trim() || undefined,
    latitude: params.latitude,
    longitude: params.longitude,
    radiusMeters: params.radiusMeters,
    categoryGroup: params.categoryGroup,
    foodCategory: params.foodCategory,
    maxPricePerPerson: params.maxPricePerPerson,
    isIndoor: params.isIndoor,
    page: params.page,
    size: params.size,
  });
  return apiFetch<PlaceSearchListResponse>(`/api/v1/places/search${qs}`, {
    method: "GET",
  });
}

export function recommendFoodsApi(
  params: FoodRecommendQueryParams,
): Promise<FoodRecommendationResponse> {
  const qs = buildQueryString({
    foodCategory: params.foodCategory,
    latitude: params.latitude,
    longitude: params.longitude,
    budgetPerPerson: params.budgetPerPerson,
  });
  return apiFetch<FoodRecommendationResponse>(
    `/api/v1/places/foods/recommend${qs}`,
    {
      method: "GET",
    },
  );
}

export function getPlaceDetailApi(placeId: number): Promise<PlaceDetail> {
  return apiFetch<PlaceDetail>(`/api/v1/places/${placeId}`, {
    method: "GET",
  });
}

