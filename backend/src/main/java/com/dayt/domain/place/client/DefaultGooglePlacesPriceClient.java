package com.dayt.domain.place.client;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.dayt.domain.place.entity.PlaceCategoryGroup;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class DefaultGooglePlacesPriceClient implements GooglePlacesPriceClient {

	private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
			new ParameterizedTypeReference<>() {};

	private static final String FIELD_MASK =
			"places.id,places.displayName,places.priceRange,places.priceLevel";

	private final RestClient restClient;
	private final String apiKey;
	private final boolean enabled;

	public DefaultGooglePlacesPriceClient(
			@Value("${dayt.google-places.api-key:}") String apiKey,
			@Value("${dayt.google-places.enabled:true}") boolean enabled
	) {
		this.apiKey = apiKey;
		this.enabled = enabled;

		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(1500);
		factory.setReadTimeout(2500);

		this.restClient = RestClient.builder()
				.baseUrl("https://places.googleapis.com")
				.requestFactory(factory)
				.build();
	}

	@Override
	public boolean isConfigured() {
		return enabled
				&& apiKey != null
				&& !apiKey.isBlank()
				&& !apiKey.startsWith("your_");
	}

	@Override
	@SuppressWarnings("unchecked")
	public Optional<GooglePriceResult> lookupPrice(
			String name,
			String address,
			double latitude,
			double longitude,
			PlaceCategoryGroup categoryGroup
	) {
		if (!isConfigured() || name == null || name.isBlank()) {
			return Optional.empty();
		}

		String textQuery = (address != null && !address.isBlank())
				? name.trim() + " " + address.trim()
				: name.trim();

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("textQuery", textQuery);
		payload.put("languageCode", "ko");
		payload.put("regionCode", "KR");
		payload.put("pageSize", 1);
		payload.put("locationBias", Map.of(
				"circle", Map.of(
						"center", Map.of(
								"latitude", latitude,
								"longitude", longitude
						),
						"radius", 200.0
				)
		));

		try {
			Map<String, Object> response = restClient.post()
					.uri("/v1/places:searchText")
					.contentType(MediaType.APPLICATION_JSON)
					.header("X-Goog-Api-Key", apiKey)
					.header("X-Goog-FieldMask", FIELD_MASK)
					.body(payload)
					.retrieve()
					.body(MAP_TYPE);

			if (response == null || !(response.get("places") instanceof List<?> places) || places.isEmpty()) {
				return Optional.empty();
			}

			Map<String, Object> firstPlace = (Map<String, Object>) places.getFirst();
			return parsePlacePriceMap(firstPlace, categoryGroup);
		}
		catch (RestClientException ex) {
			log.debug("Google Places price lookup skipped/failed (name={}): {}", name, ex.getMessage());
			return Optional.empty();
		}
	}

	@SuppressWarnings("unchecked")
	static Optional<GooglePriceResult> parsePlacePriceMap(
			Map<String, Object> placeMap,
			PlaceCategoryGroup categoryGroup
	) {
		if (placeMap == null) {
			return Optional.empty();
		}

		// 1. Prefer exact KRW `priceRange` ("1인당 ₩10,000~20,000")
		if (placeMap.get("priceRange") instanceof Map<?, ?> rawRange) {
			Map<String, Object> priceRange = (Map<String, Object>) rawRange;
			Long startKrw = extractKrwUnits(priceRange.get("startPrice"));
			Long endKrw = extractKrwUnits(priceRange.get("endPrice"));

			if (startKrw != null && endKrw != null && endKrw > 0) {
				int midpoint;
				if (startKrw <= 1000 && endKrw == 10000) {
					midpoint = 7000;
				}
				else {
					midpoint = (int) (Math.round(((startKrw + endKrw) / 2.0) / 1000.0) * 1000);
				}
				String tag = formatRangeHashtag(startKrw, endKrw);
				return Optional.of(new GooglePriceResult(Math.max(0, midpoint), tag));
			}
			if (startKrw != null && startKrw > 0) {
				return Optional.of(new GooglePriceResult(
						startKrw.intValue(),
						"#구글맵_" + formatManWon(startKrw) + "이상"
				));
			}
			if (endKrw != null && endKrw > 0) {
				return Optional.of(new GooglePriceResult(
						endKrw.intValue(),
						"#구글맵_" + formatManWon(endKrw) + "이하"
				));
			}
		}

		// 2. Fallback to `priceLevel` enum if `priceRange` is absent
		if (placeMap.get("priceLevel") instanceof String priceLevel) {
			boolean isCafe = categoryGroup == PlaceCategoryGroup.CAFE;
			return switch (priceLevel) {
				case "PRICE_LEVEL_FREE" -> Optional.of(new GooglePriceResult(0, "#무료관람"));
				case "PRICE_LEVEL_INEXPENSIVE" -> Optional.of(new GooglePriceResult(
						isCafe ? 6000 : 9000,
						"#구글맵_가성비"
				));
				case "PRICE_LEVEL_MODERATE" -> Optional.of(new GooglePriceResult(
						isCafe ? 10000 : 18000,
						"#구글맵_보통가격대"
				));
				case "PRICE_LEVEL_EXPENSIVE" -> Optional.of(new GooglePriceResult(
						isCafe ? 18000 : 40000,
						"#구글맵_고급다이닝"
				));
				case "PRICE_LEVEL_VERY_EXPENSIVE" -> Optional.of(new GooglePriceResult(
						85000,
						"#구글맵_파인다이닝"
				));
				default -> Optional.empty();
			};
		}

		return Optional.empty();
	}

	@SuppressWarnings("unchecked")
	private static Long extractKrwUnits(Object moneyObj) {
		if (!(moneyObj instanceof Map<?, ?> rawMoney)) {
			return null;
		}
		Map<String, Object> money = (Map<String, Object>) rawMoney;
		Object currency = money.get("currencyCode");
		if (currency != null && !"KRW".equalsIgnoreCase(String.valueOf(currency))) {
			return null;
		}
		Object units = money.get("units");
		if (units == null) {
			return null;
		}
		try {
			return Long.parseLong(String.valueOf(units));
		}
		catch (NumberFormatException ex) {
			return null;
		}
	}

	private static String formatRangeHashtag(long startKrw, long endKrw) {
		if (startKrw <= 1000 && endKrw <= 10000) {
			return "#구글맵_1만원이하";
		}
		return "#구글맵_" + formatManWon(startKrw) + "~" + formatManWon(endKrw);
	}

	private static String formatManWon(long krw) {
		if (krw >= 10000 && krw % 10000 == 0) {
			return (krw / 10000) + "만";
		}
		if (krw >= 10000) {
			return String.format("%.1f만", krw / 10000.0);
		}
		return (krw / 1000) + "천원";
	}
}

