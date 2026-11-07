package com.dayt.domain.place.client;

import java.util.Map;
import java.util.Optional;

import com.dayt.domain.place.client.GooglePlacesPriceClient.GooglePriceResult;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultGooglePlacesPriceClientTest {

	@Test
	@DisplayName("Google Places priceRange(KRW 10,000~20,000) 응답 시 중앙값 15,000원과 해시태그를 추출한다")
	void parsePriceRangeMidpoint() {
		Map<String, Object> placeMap = Map.of(
				"id", "ChIJ-sample-1",
				"priceRange", Map.of(
						"startPrice", Map.of("currencyCode", "KRW", "units", "10000"),
						"endPrice", Map.of("currencyCode", "KRW", "units", "20000")
				)
		);

		Optional<GooglePriceResult> result = DefaultGooglePlacesPriceClient.parsePlacePriceMap(
				placeMap,
				PlaceCategoryGroup.RESTAURANT
		);

		assertThat(result).isPresent();
		assertThat(result.get().avgPricePerPerson()).isEqualTo(15000);
		assertThat(result.get().rangeHashtag()).isEqualTo("#구글맵_1만~2만");
	}

	@Test
	@DisplayName("Google Places priceRange(KRW 1~10,000) 구간은 7,000원과 1만원이하 태그로 변환한다")
	void parseUnderTenThousandRange() {
		Map<String, Object> placeMap = Map.of(
				"priceRange", Map.of(
						"startPrice", Map.of("currencyCode", "KRW", "units", "1"),
						"endPrice", Map.of("currencyCode", "KRW", "units", "10000")
				)
		);

		Optional<GooglePriceResult> result = DefaultGooglePlacesPriceClient.parsePlacePriceMap(
				placeMap,
				PlaceCategoryGroup.CAFE
		);

		assertThat(result).isPresent();
		assertThat(result.get().avgPricePerPerson()).isEqualTo(7000);
		assertThat(result.get().rangeHashtag()).isEqualTo("#구글맵_1만원이하");
	}

	@Test
	@DisplayName("priceRange가 없고 priceLevel만 있는 경우 priceLevel 등급을 기반으로 매핑한다")
	void fallbackToPriceLevel() {
		Map<String, Object> placeMap = Map.of(
				"priceLevel", "PRICE_LEVEL_EXPENSIVE"
		);

		Optional<GooglePriceResult> result = DefaultGooglePlacesPriceClient.parsePlacePriceMap(
				placeMap,
				PlaceCategoryGroup.RESTAURANT
		);

		assertThat(result).isPresent();
		assertThat(result.get().avgPricePerPerson()).isEqualTo(40000);
		assertThat(result.get().rangeHashtag()).isEqualTo("#구글맵_고급다이닝");
	}

	@Test
	@DisplayName("가격 정보가 전혀 없는 매장은 가짜 추정치를 넣지 않고 empty를 반환한다")
	void returnsEmptyWhenNoPriceMetadataExists() {
		Map<String, Object> placeMap = Map.of(
				"id", "ChIJ-no-price",
				"displayName", Map.of("text", "신상 로컬 식당")
		);

		Optional<GooglePriceResult> result = DefaultGooglePlacesPriceClient.parsePlacePriceMap(
				placeMap,
				PlaceCategoryGroup.RESTAURANT
		);

		assertThat(result).isEmpty();
	}
}

