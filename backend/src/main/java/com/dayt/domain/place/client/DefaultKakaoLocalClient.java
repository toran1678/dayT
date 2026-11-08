package com.dayt.domain.place.client;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class DefaultKakaoLocalClient implements KakaoLocalClient {

	private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
			new ParameterizedTypeReference<>() {};

	private final RestClient restClient;
	private final String kakaoRestApiKey;
	private final boolean enabled;

	public DefaultKakaoLocalClient(
			@Value("${dayt.oauth.kakao.rest-api-key:}") String kakaoRestApiKey,
			@Value("${dayt.kakao-local.enabled:true}") boolean enabled
	) {
		this.kakaoRestApiKey = kakaoRestApiKey;
		this.enabled = enabled;
		this.restClient = RestClient.builder()
				.baseUrl("https://dapi.kakao.com")
				.build();
	}

	@Override
	public boolean isConfigured() {
		return enabled
				&& kakaoRestApiKey != null
				&& !kakaoRestApiKey.isBlank()
				&& !kakaoRestApiKey.startsWith("your_");
	}

	@Override
	public Optional<GeoPoint> resolveLocationByKeyword(String keyword) {
		if (!isConfigured() || keyword == null || keyword.isBlank()) {
			return Optional.empty();
		}
		String trimmed = keyword.trim();

		// 1. Try administrative / road address lookup first (e.g. "구월동", "인천 연수구", "송도동")
		Optional<GeoPoint> addressPoint = executeAddressQuery(trimmed);
		if (addressPoint.isPresent()) {
			return addressPoint;
		}

		// 2. Fallback to landmark / station POI lookup (e.g. "인천터미널", "성수역", "부평문화의거리")
		List<Map<String, Object>> docs = executeKeywordQuery(trimmed, null, null, 2000, null, 1);
		if (docs.isEmpty()) {
			return Optional.empty();
		}
		Map<String, Object> first = docs.getFirst();
		Double lat = parseDoubleOrNull(first.get("y"));
		Double lng = parseDoubleOrNull(first.get("x"));
		if (lat == null || lng == null) {
			return Optional.empty();
		}
		return Optional.of(new GeoPoint(lat, lng));
	}

	@Override
	public List<KakaoPlaceCandidate> searchByKeyword(
			String keyword,
			Double latitude,
			Double longitude,
			int radiusMeters,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory
	) {
		if (!isConfigured()) {
			return List.of();
		}

		String baseRegion = (keyword != null && !keyword.isBlank()) ? keyword.trim() : "";
		boolean hasAnchorCoords = latitude != null && longitude != null;
		List<QuerySpec> querySpecs = buildQuerySpecs(baseRegion, hasAnchorCoords, categoryGroup, foodCategory);

		Map<String, KakaoPlaceCandidate> deduplicated = new LinkedHashMap<>();
		for (QuerySpec spec : querySpecs) {
			List<Map<String, Object>> docs = executeKeywordQuery(
					spec.query(),
					latitude,
					longitude,
					radiusMeters,
					spec.kakaoGroupCode(),
					10
			);
			for (Map<String, Object> doc : docs) {
				parseDocument(doc, baseRegion, spec.preferredGroup()).ifPresent(candidate ->
						deduplicated.putIfAbsent(candidate.externalPlaceId(), candidate)
				);
			}
		}

		return new ArrayList<>(deduplicated.values());
	}

	private record QuerySpec(
			String query,
			String kakaoGroupCode,
			PlaceCategoryGroup preferredGroup
	) {
	}

	private static List<QuerySpec> buildQuerySpecs(
			String baseRegion,
			boolean hasAnchorCoords,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory
	) {
		// When (latitude, longitude) is already resolved, spatial radius filtering handles the area.
		// Prepending landmark names like "인천터미널 " would wrongly exclude nearby spots without "인천터미널" in their name.
		String prefix = (hasAnchorCoords || baseRegion.isEmpty()) ? "" : baseRegion + " ";

		if (foodCategory != null) {
			return List.of(
					new QuerySpec(prefix + foodCategory.getLabel(), "FD6", PlaceCategoryGroup.RESTAURANT)
			);
		}
		if (categoryGroup != null) {
			return switch (categoryGroup) {
				case RESTAURANT -> List.of(
						new QuerySpec(prefix + "맛집", "FD6", PlaceCategoryGroup.RESTAURANT),
						new QuerySpec(prefix + "식당", "FD6", PlaceCategoryGroup.RESTAURANT)
				);
				case CAFE -> List.of(
						new QuerySpec(prefix + "카페", "CE7", PlaceCategoryGroup.CAFE),
						new QuerySpec(prefix + "디저트", "CE7", PlaceCategoryGroup.CAFE)
				);
				case EXHIBITION -> List.of(
						new QuerySpec(prefix + "전시", "CT1", PlaceCategoryGroup.EXHIBITION),
						new QuerySpec(prefix + "문화", "CT1", PlaceCategoryGroup.EXHIBITION),
						new QuerySpec(prefix + "미술관", "CT1", PlaceCategoryGroup.EXHIBITION)
				);
				case ACTIVITY -> List.of(
						new QuerySpec(prefix + "공방", null, PlaceCategoryGroup.ACTIVITY),
						new QuerySpec(prefix + "방탈출", null, PlaceCategoryGroup.ACTIVITY),
						new QuerySpec(prefix + "볼링", null, PlaceCategoryGroup.ACTIVITY)
				);
				case PARK -> List.of(
						new QuerySpec(prefix + "공원", null, PlaceCategoryGroup.PARK),
						new QuerySpec(prefix + "산책", "AT4", PlaceCategoryGroup.PARK)
				);
				case ETC -> List.of(
						new QuerySpec(baseRegion.isEmpty() ? "데이트" : baseRegion, null, PlaceCategoryGroup.ETC)
				);
			};
		}
		// Balanced date spot discovery when browsing "전체"
		return List.of(
				new QuerySpec(prefix + "맛집", "FD6", PlaceCategoryGroup.RESTAURANT),
				new QuerySpec(prefix + "카페", "CE7", PlaceCategoryGroup.CAFE),
				new QuerySpec(prefix + "공원", null, PlaceCategoryGroup.PARK),
				new QuerySpec(prefix + "문화", "CT1", PlaceCategoryGroup.EXHIBITION)
		);
	}

	@SuppressWarnings("unchecked")
	private Optional<GeoPoint> executeAddressQuery(String query) {
		try {
			Map<String, Object> body = restClient.get()
					.uri(uriBuilder -> uriBuilder
							.path("/v2/local/search/address.json")
							.queryParam("query", query)
							.queryParam("size", 1)
							.build())
					.header("Authorization", "KakaoAK " + kakaoRestApiKey)
					.retrieve()
					.body(MAP_TYPE);

			if (body != null && body.get("documents") instanceof List<?> rawList && !rawList.isEmpty()) {
				Map<String, Object> first = (Map<String, Object>) rawList.getFirst();
				Double lat = parseDoubleOrNull(first.get("y"));
				Double lng = parseDoubleOrNull(first.get("x"));
				if (lat != null && lng != null) {
					return Optional.of(new GeoPoint(lat, lng));
				}
			}
		}
		catch (RestClientException ex) {
			log.debug("Kakao Address API lookup skipped/failed (query={}): {}", query, ex.getMessage());
		}
		return Optional.empty();
	}

	@SuppressWarnings("unchecked")
	private List<Map<String, Object>> executeKeywordQuery(
			String query,
			Double latitude,
			Double longitude,
			int radiusMeters,
			String categoryGroupCode,
			int size
	) {
		try {
			Map<String, Object> body = restClient.get()
					.uri(uriBuilder -> {
						uriBuilder.path("/v2/local/search/keyword.json")
								.queryParam("query", query)
								.queryParam("size", size);
						if (categoryGroupCode != null) {
							uriBuilder.queryParam("category_group_code", categoryGroupCode);
						}
						if (latitude != null && longitude != null) {
							uriBuilder.queryParam("y", latitude)
									.queryParam("x", longitude)
									.queryParam("radius", Math.min(Math.max(radiusMeters, 100), 20000));
						}
						return uriBuilder.build();
					})
					.header("Authorization", "KakaoAK " + kakaoRestApiKey)
					.retrieve()
					.body(MAP_TYPE);

			if (body != null && body.get("documents") instanceof List<?> rawList) {
				return (List<Map<String, Object>>) rawList;
			}
		}
		catch (RestClientException ex) {
			log.warn("Kakao Local API request skipped/failed (query={}): {}", query, ex.getMessage());
		}
		return List.of();
	}

	private static Optional<KakaoPlaceCandidate> parseDocument(
			Map<String, Object> doc,
			String regionHint,
			PlaceCategoryGroup preferredGroup
	) {
		String id = asString(doc.get("id"));
		String name = asString(doc.get("place_name"));
		Double lat = parseDoubleOrNull(doc.get("y"));
		Double lng = parseDoubleOrNull(doc.get("x"));

		if (id == null || name == null || lat == null || lng == null) {
			return Optional.empty();
		}

		String roadAddress = asString(doc.get("road_address_name"));
		String jibunAddress = asString(doc.get("address_name"));
		String address = (roadAddress != null && !roadAddress.isBlank())
				? roadAddress
				: (jibunAddress != null ? jibunAddress : "");
		if (address.isBlank()) {
			return Optional.empty();
		}

		String groupCode = asString(doc.get("category_group_code"));
		String categoryName = asString(doc.get("category_name"));

		PlaceCategoryGroup group = mapCategoryGroup(groupCode, categoryName, preferredGroup);
		FoodCategory foodCat = (group == PlaceCategoryGroup.RESTAURANT)
				? inferFoodCategory(categoryName)
				: null;
		String subCategory = extractLeafSubCategory(categoryName);

		boolean indoor = group != PlaceCategoryGroup.PARK;
		Integer estimatedPrice = estimateDefaultPrice(group);

		List<String> tags = new ArrayList<>();
		if (subCategory != null) {
			tags.add("#" + subCategory.replaceAll("\\s+", ""));
		}
		if (regionHint != null && !regionHint.isBlank()) {
			tags.add("#" + regionHint.replaceAll("\\s+", ""));
		}
		tags.add(indoor ? "#실내데이트" : "#야외산책");

		String summary = (subCategory != null)
				? address + " 인근에서 방문하기 좋은 " + subCategory + " 스팟이에요."
				: address + " 인근 추천 데이트 스팟이에요.";

		return Optional.of(new KakaoPlaceCandidate(
				id,
				name,
				group,
				foodCat,
				subCategory,
				address,
				(regionHint != null && !regionHint.isBlank()) ? regionHint : null,
				lat,
				lng,
				emptyToNull(asString(doc.get("phone"))),
				emptyToNull(asString(doc.get("place_url"))),
				estimatedPrice,
				indoor,
				tags,
				summary
		));
	}

	private static PlaceCategoryGroup mapCategoryGroup(
			String groupCode,
			String categoryName,
			PlaceCategoryGroup preferredGroup
	) {
		if ("FD6".equals(groupCode)) return PlaceCategoryGroup.RESTAURANT;
		if ("CE7".equals(groupCode)) return PlaceCategoryGroup.CAFE;
		if ("CT1".equals(groupCode)) return PlaceCategoryGroup.EXHIBITION;

		if (categoryName != null) {
			if (categoryName.contains("음식점")) return PlaceCategoryGroup.RESTAURANT;
			if (categoryName.contains("카페") || categoryName.contains("커피") || categoryName.contains("디저트")) {
				return PlaceCategoryGroup.CAFE;
			}
			if (categoryName.contains("공원") || categoryName.contains("산책")
					|| categoryName.contains("숲") || categoryName.contains("수목원")
					|| categoryName.contains("광장") || categoryName.contains("호수")
					|| categoryName.contains("해수욕장") || categoryName.contains("해변")) {
				return PlaceCategoryGroup.PARK;
			}
			if (categoryName.contains("전시") || categoryName.contains("미술관")
					|| categoryName.contains("박물관") || categoryName.contains("갤러리")
					|| categoryName.contains("문화") || categoryName.contains("공연")
					|| categoryName.contains("영화관") || categoryName.contains("아트")) {
				return PlaceCategoryGroup.EXHIBITION;
			}
			if (categoryName.contains("공방") || categoryName.contains("체험")
					|| categoryName.contains("보드게임") || categoryName.contains("방탈출")
					|| categoryName.contains("볼링") || categoryName.contains("오락")
					|| categoryName.contains("클래스") || categoryName.contains("스튜디오")
					|| categoryName.contains("공예") || categoryName.contains("소품")) {
				return PlaceCategoryGroup.ACTIVITY;
			}
		}

		if ("AT4".equals(groupCode)) {
			return preferredGroup == PlaceCategoryGroup.PARK
					? PlaceCategoryGroup.PARK
					: PlaceCategoryGroup.ACTIVITY;
		}
		if (preferredGroup != null && preferredGroup != PlaceCategoryGroup.ETC) {
			return preferredGroup;
		}
		return PlaceCategoryGroup.ETC;
	}

	private static FoodCategory inferFoodCategory(String categoryName) {
		if (categoryName == null) return FoodCategory.ETC;
		// 동남아/아시안/이색 퓨전은 ETC(그 외)로 최우선 분기하여 타 카테고리(일식/양식 등)로의 오분류 원천 차단
		if (categoryName.contains("동남아") || categoryName.contains("베트남") || categoryName.contains("태국")
				|| categoryName.contains("아시아") || categoryName.contains("인도") || categoryName.contains("쌀국수")
				|| categoryName.contains("멕시칸") || categoryName.contains("터키") || categoryName.contains("퓨전")) {
			return FoodCategory.ETC;
		}
		if (categoryName.contains("일식") || categoryName.contains("돈까스") || categoryName.contains("돈가스")
				|| categoryName.contains("초밥") || categoryName.contains("스시") || categoryName.contains("라멘")
				|| categoryName.contains("우동") || categoryName.contains("소바") || categoryName.contains("가츠")
				|| categoryName.contains("텐동") || categoryName.contains("덮밥") || categoryName.contains("이자카야")) {
			return FoodCategory.JAPANESE;
		}
		if (categoryName.contains("양식") || categoryName.contains("이탈리안") || categoryName.contains("파스타")
				|| categoryName.contains("피자") || categoryName.contains("스테이크") || categoryName.contains("브런치")
				|| categoryName.contains("버거")) {
			return FoodCategory.WESTERN;
		}
		if (categoryName.contains("중식") || categoryName.contains("중국") || categoryName.contains("딤섬")
				|| categoryName.contains("마라") || categoryName.contains("양꼬치")) {
			return FoodCategory.CHINESE;
		}
		if (categoryName.contains("치킨") || categoryName.contains("통닭")) {
			return FoodCategory.CHICKEN;
		}
		if (categoryName.contains("육류") || categoryName.contains("고기") || categoryName.contains("삼겹살")
				|| categoryName.contains("갈비") || categoryName.contains("곱창") || categoryName.contains("막창")) {
			return FoodCategory.MEAT;
		}
		if (categoryName.contains("분식") || categoryName.contains("떡볶이") || categoryName.contains("김밥")) {
			return FoodCategory.SNACK;
		}
		if (categoryName.contains("한식") || categoryName.contains("국밥") || categoryName.contains("백반")
				|| categoryName.contains("찌개") || categoryName.contains("솥밥")) {
			return FoodCategory.KOREAN;
		}
		return FoodCategory.ETC;
	}

	private static String extractLeafSubCategory(String categoryName) {
		if (categoryName == null || categoryName.isBlank()) return null;
		String[] parts = categoryName.split(">");
		String leaf = parts[parts.length - 1].trim();
		return leaf.isEmpty() ? null : leaf;
	}

	private static Integer estimateDefaultPrice(PlaceCategoryGroup group) {
		// Kakao Local API does not provide menu prices.
		// Only public parks default to 0 (free); all commercial spots stay null ("가격 미확인")
		// until verified via Google Places `priceRange`/`priceLevel` or explicit menu extraction.
		return group == PlaceCategoryGroup.PARK ? 0 : null;
	}

	private static String asString(Object val) {
		return (val != null) ? String.valueOf(val) : null;
	}

	private static String emptyToNull(String val) {
		return (val == null || val.isBlank()) ? null : val;
	}

	private static Double parseDoubleOrNull(Object val) {
		if (val == null) return null;
		try {
			return Double.parseDouble(String.valueOf(val));
		}
		catch (NumberFormatException ex) {
			return null;
		}
	}
}
