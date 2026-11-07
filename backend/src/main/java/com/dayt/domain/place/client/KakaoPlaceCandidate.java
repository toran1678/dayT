package com.dayt.domain.place.client;

import java.util.List;

import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.PlaceCategoryGroup;

public record KakaoPlaceCandidate(
		String externalPlaceId,
		String name,
		PlaceCategoryGroup categoryGroup,
		FoodCategory foodCategory,
		String subCategory,
		String address,
		String regionKeyword,
		double latitude,
		double longitude,
		String phone,
		String placeUrl,
		Integer estimatedPricePerPerson,
		Boolean isIndoor,
		List<String> initialHashtags,
		String initialSummary
) {
}

