package com.dayt.domain.ai.dto;

import com.dayt.domain.place.entity.PlaceCategoryGroup;

public record InternalPlaceEnrichRequest(
		Long placeId,
		String name,
		String address,
		PlaceCategoryGroup categoryGroup
) {
}

