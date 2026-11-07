package com.dayt.domain.place.client;

import java.util.List;
import java.util.Optional;

import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.PlaceCategoryGroup;

public interface KakaoLocalClient {

	record GeoPoint(double latitude, double longitude) {
	}

	boolean isConfigured();

	Optional<GeoPoint> resolveLocationByKeyword(String keyword);

	List<KakaoPlaceCandidate> searchByKeyword(
			String keyword,
			Double latitude,
			Double longitude,
			int radiusMeters,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory
	);
}

