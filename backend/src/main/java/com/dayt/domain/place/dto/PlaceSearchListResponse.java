package com.dayt.domain.place.dto;

import java.util.List;

public record PlaceSearchListResponse(
		List<PlaceDetailResponse> items,
		int page,
		int size,
		boolean hasNext
) {
}

