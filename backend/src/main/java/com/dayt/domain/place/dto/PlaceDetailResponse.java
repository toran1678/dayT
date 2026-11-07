package com.dayt.domain.place.dto;

import java.time.LocalDate;
import java.util.List;

import com.dayt.domain.place.entity.ExternalPlaceProvider;
import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.Place;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record PlaceDetailResponse(
		Long id,
		ExternalPlaceProvider externalProvider,
		String externalPlaceId,
		String name,
		PlaceCategoryGroup categoryGroup,
		FoodCategory foodCategory,
		String subCategory,
		String address,
		Double latitude,
		Double longitude,
		String phone,
		String placeUrl,
		String thumbnailUrl,
		Integer avgPricePerPerson,
		Boolean isIndoor,
		List<String> hashtags,
		List<String> recommendedMenus,
		String aiSummary,
		LocalDate eventStartDate,
		LocalDate eventEndDate
) {
	public static PlaceDetailResponse from(Place place) {
		return new PlaceDetailResponse(
				place.getId(),
				place.getExternalProvider(),
				place.getExternalPlaceId(),
				place.getName(),
				place.getCategoryGroup(),
				place.getFoodCategory(),
				place.getSubCategory(),
				place.getAddress(),
				place.getLatitude(),
				place.getLongitude(),
				place.getPhone(),
				place.getPlaceUrl(),
				place.getThumbnailUrl(),
				place.getAvgPricePerPerson(),
				place.getIsIndoor(),
				place.getHashtags() != null ? List.copyOf(place.getHashtags()) : List.of(),
				place.getRecommendedMenus() != null ? List.copyOf(place.getRecommendedMenus()) : List.of(),
				place.getAiSummary(),
				place.getEventStartDate(),
				place.getEventEndDate()
		);
	}
}

