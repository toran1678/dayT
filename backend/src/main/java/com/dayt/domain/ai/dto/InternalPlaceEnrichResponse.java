package com.dayt.domain.ai.dto;

import java.util.List;

public record InternalPlaceEnrichResponse(
		Long placeId,
		List<String> hashtags,
		List<String> recommendedMenus,
		Integer avgPricePerPerson,
		Boolean isIndoor,
		String oneLineSummary
) {
}

