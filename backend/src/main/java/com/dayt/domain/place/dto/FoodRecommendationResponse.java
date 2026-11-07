package com.dayt.domain.place.dto;

import java.util.List;

import com.dayt.domain.place.entity.FoodCategory;

public record FoodRecommendationResponse(
		FoodCategory recommendedFoodCategory,
		String recommendedSubMenu,
		String reason,
		List<PlaceDetailResponse> places
) {
}

