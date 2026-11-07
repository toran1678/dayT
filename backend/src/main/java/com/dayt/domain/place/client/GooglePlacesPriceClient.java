package com.dayt.domain.place.client;

import java.util.Optional;

import com.dayt.domain.place.entity.PlaceCategoryGroup;

public interface GooglePlacesPriceClient {

	record GooglePriceResult(int avgPricePerPerson, String rangeHashtag) {
	}

	boolean isConfigured();

	Optional<GooglePriceResult> lookupPrice(
			String name,
			String address,
			double latitude,
			double longitude,
			PlaceCategoryGroup categoryGroup
	);
}

