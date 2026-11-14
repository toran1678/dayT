package com.dayt.domain.place.service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import com.dayt.domain.ai.client.AiServiceClient;
import com.dayt.domain.ai.dto.InternalPlaceEnrichRequest;
import com.dayt.domain.place.cache.PlaceSearchCacheStore;
import com.dayt.domain.place.client.GooglePlacesPriceClient;
import com.dayt.domain.place.client.GooglePlacesPriceClient.GooglePriceResult;
import com.dayt.domain.place.client.KakaoLocalClient;
import com.dayt.domain.place.client.KakaoLocalClient.GeoPoint;
import com.dayt.domain.place.client.KakaoPlaceCandidate;
import com.dayt.domain.place.dto.FoodRecommendationResponse;
import com.dayt.domain.place.dto.PlaceDetailResponse;
import com.dayt.domain.place.dto.PlaceSearchListResponse;
import com.dayt.domain.place.entity.ExternalPlaceProvider;
import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.Place;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import com.dayt.domain.place.repository.PlaceQueryRepository;
import com.dayt.domain.place.repository.PlaceQueryRepository.SearchCriteria;
import com.dayt.domain.place.repository.PlaceRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlaceService {

	private static final Map<String, GeoPoint> KNOWN_ANCHORS = Map.ofEntries(
			Map.entry("성수역", new GeoPoint(37.544580, 127.055970)),
			Map.entry("성수동", new GeoPoint(37.544580, 127.055970)),
			Map.entry("성수", new GeoPoint(37.544580, 127.055970)),
			Map.entry("서울숲", new GeoPoint(37.544380, 127.037440)),
			Map.entry("연남동", new GeoPoint(37.561850, 126.925100)),
			Map.entry("연남", new GeoPoint(37.561850, 126.925100)),
			Map.entry("홍대입구역", new GeoPoint(37.557527, 126.924467)),
			Map.entry("홍대", new GeoPoint(37.557527, 126.924467)),
			Map.entry("한남동", new GeoPoint(37.536920, 127.001420)),
			Map.entry("한남", new GeoPoint(37.536920, 127.001420)),
			Map.entry("강남역", new GeoPoint(37.497950, 127.027620)),
			Map.entry("강남", new GeoPoint(37.497950, 127.027620)),
			Map.entry("혜화역", new GeoPoint(37.582080, 127.001890)),
			Map.entry("대학로", new GeoPoint(37.582080, 127.001890)),
			Map.entry("잠실역", new GeoPoint(37.513260, 127.100130))
	);

	private static final ExecutorService PRICE_ENRICH_EXECUTOR = Executors.newVirtualThreadPerTaskExecutor();

	private final PlaceRepository placeRepository;
	private final PlaceQueryRepository placeQueryRepository;
	private final KakaoLocalClient kakaoLocalClient;
	private final GooglePlacesPriceClient googlePlacesPriceClient;
	private final PlaceSearchCacheStore cacheStore;
	private final AiServiceClient aiServiceClient;

	@Transactional
	public PlaceSearchListResponse searchPlaces(
			String keyword,
			Double latitude,
			Double longitude,
			int radiusMeters,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory,
			Integer maxPricePerPerson,
			Boolean isIndoor,
			int page,
			int size
	) {
		if (radiusMeters < 100 || radiusMeters > 10000) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "검색 반경(radiusMeters)은 100m 이상 10,000m 이하여야 합니다.");
		}
		if (page < 0 || size < 1 || size > 100) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "페이징 파라미터가 올바르지 않습니다.");
		}

		String normalizedKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
		String cacheKey = buildSearchCacheKey(
				normalizedKeyword,
				latitude,
				longitude,
				radiusMeters,
				categoryGroup,
				foodCategory,
				maxPricePerPerson,
				isIndoor,
				page,
				size
		);

		Optional<PlaceSearchListResponse> cached = cacheStore.getCached(cacheKey, PlaceSearchListResponse.class);
		if (cached.isPresent()) {
			return cached.get();
		}

		Double resolvedLat = latitude;
		Double resolvedLng = longitude;

		if (resolvedLat == null || resolvedLng == null) {
			Optional<GeoPoint> anchor = resolveKeywordAnchor(normalizedKeyword);
			if (anchor.isPresent()) {
				resolvedLat = anchor.get().latitude();
				resolvedLng = anchor.get().longitude();
			}
		}

		syncFromKakaoIfNeeded(normalizedKeyword, resolvedLat, resolvedLng, radiusMeters, categoryGroup, foodCategory);

		SearchCriteria criteria = new SearchCriteria(
				normalizedKeyword,
				resolvedLat,
				resolvedLng,
				radiusMeters,
				categoryGroup,
				foodCategory,
				maxPricePerPerson,
				isIndoor,
				page,
				size
		);

		List<Place> rawMatches = placeQueryRepository.searchPlaces(criteria);
		enrichMissingGooglePrices(rawMatches.stream().limit(size).toList());

		List<Place> budgetFiltered = (maxPricePerPerson == null)
				? rawMatches
				: rawMatches.stream()
						.filter(p -> p.getAvgPricePerPerson() == null || p.getAvgPricePerPerson() <= maxPricePerPerson)
						.toList();

		boolean hasNext = budgetFiltered.size() > size;
		List<PlaceDetailResponse> items = budgetFiltered.stream()
				.limit(size)
				.map(PlaceDetailResponse::from)
				.toList();

		PlaceSearchListResponse response = new PlaceSearchListResponse(items, page, size, hasNext);
		if (!items.isEmpty()) {
			cacheStore.putCached(cacheKey, response);
		}
		return response;
	}

	@Transactional
	public FoodRecommendationResponse recommendFoods(
			FoodCategory requestedCategory,
			Double latitude,
			Double longitude,
			Integer budgetPerPerson
	) {
		if (budgetPerPerson != null && budgetPerPerson <= 0) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "1인 예산(budgetPerPerson)은 양수여야 합니다.");
		}

		FoodCategory targetCategory = (requestedCategory != null)
				? requestedCategory
				: pickOptimalCategoryForBudget(budgetPerPerson);

		String cacheKey = "food_rec:%s:%s:%s:%s".formatted(
				targetCategory.name(),
				roundCoord(latitude),
				roundCoord(longitude),
				budgetPerPerson
		);

		Optional<FoodRecommendationResponse> cached = cacheStore.getCached(cacheKey, FoodRecommendationResponse.class);
		if (cached.isPresent()) {
			return cached.get();
		}

		if (latitude != null && longitude != null) {
			syncFromKakaoIfNeeded(null, latitude, longitude, 2500, PlaceCategoryGroup.RESTAURANT, targetCategory);
		}

		List<Place> spatialMatches = placeQueryRepository.searchPlaces(new SearchCriteria(
				null,
				latitude,
				longitude,
				2500,
				PlaceCategoryGroup.RESTAURANT,
				targetCategory,
				budgetPerPerson,
				null,
				0,
				6
		));

		if (spatialMatches.isEmpty() && latitude != null && longitude != null) {
			// Broaden beyond local radius if no nearby match exists yet
			spatialMatches = placeQueryRepository.searchPlaces(new SearchCriteria(
					null,
					null,
					null,
					2500,
					PlaceCategoryGroup.RESTAURANT,
					targetCategory,
					budgetPerPerson,
					null,
					0,
					6
			));
		}

		enrichMissingGooglePrices(spatialMatches);

		List<PlaceDetailResponse> places = spatialMatches.stream()
				.filter(p -> budgetPerPerson == null
						|| p.getAvgPricePerPerson() == null
						|| p.getAvgPricePerPerson() <= budgetPerPerson)
				.limit(6)
				.map(PlaceDetailResponse::from)
				.toList();

		String recommendedSubMenu = places.stream()
				.map(PlaceDetailResponse::subCategory)
				.filter(sub -> sub != null && !sub.isBlank())
				.findFirst()
				.orElse(targetCategory.getSignatureSubMenu());

		String reason = buildRecommendationReason(targetCategory, recommendedSubMenu, budgetPerPerson, !places.isEmpty());
		FoodRecommendationResponse response = new FoodRecommendationResponse(
				targetCategory,
				recommendedSubMenu,
				reason,
				places
		);

		cacheStore.putCached(cacheKey, response);
		return response;
	}

	@Transactional
	public PlaceDetailResponse getPlaceDetail(Long placeId) {
		Place place = placeRepository.findById(placeId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "요청하신 장소를 찾을 수 없습니다."));

		enrichMissingGooglePrices(List.of(place));

		if (place.getAiEnrichedAt() == null) {
			aiServiceClient.enrichPlace(new InternalPlaceEnrichRequest(
					place.getId(),
					place.getName(),
					place.getAddress(),
					place.getCategoryGroup()
			)).ifPresent(enriched -> {
				place.applyAiEnrichment(
						enriched.hashtags(),
						enriched.recommendedMenus(),
						enriched.avgPricePerPerson(),
						enriched.isIndoor(),
						enriched.oneLineSummary(),
						Instant.now()
				);
				placeRepository.save(place);
			});
		}

		return PlaceDetailResponse.from(place);
	}

	private void enrichMissingGooglePrices(List<Place> places) {
		if (!googlePlacesPriceClient.isConfigured() || places.isEmpty()) {
			return;
		}

		List<Place> targets = places.stream()
				.filter(p -> p.getId() != null
						&& p.getAvgPricePerPerson() == null
						&& p.getCategoryGroup() != PlaceCategoryGroup.PARK
						&& !cacheStore.isGooglePriceChecked(p.getId()))
				.limit(12)
				.toList();

		if (targets.isEmpty()) {
			return;
		}

		record LookupTask(Place place, CompletableFuture<Optional<GooglePriceResult>> future) {
		}

		List<LookupTask> tasks = targets.stream()
				.map(place -> {
					String name = place.getName();
					String address = place.getAddress();
					double lat = place.getLatitude();
					double lng = place.getLongitude();
					PlaceCategoryGroup group = place.getCategoryGroup();
					CompletableFuture<Optional<GooglePriceResult>> future = CompletableFuture
							.supplyAsync(
									() -> googlePlacesPriceClient.lookupPrice(name, address, lat, lng, group),
									PRICE_ENRICH_EXECUTOR
							)
							.completeOnTimeout(Optional.empty(), 2800, TimeUnit.MILLISECONDS)
							.exceptionally(ex -> Optional.empty());
					return new LookupTask(place, future);
				})
				.toList();

		for (LookupTask task : tasks) {
			Optional<GooglePriceResult> priceOpt = task.future().join();
			Place place = task.place();
			cacheStore.markGooglePriceChecked(place.getId());
			priceOpt.ifPresent(result -> {
				place.applyVerifiedPrice(result.avgPricePerPerson(), result.rangeHashtag());
				placeRepository.save(place);
			});
		}
	}

	private Optional<GeoPoint> resolveKeywordAnchor(String keyword) {
		if (keyword == null || keyword.isBlank()) {
			return Optional.empty();
		}
		GeoPoint preset = KNOWN_ANCHORS.get(keyword);
		if (preset != null) {
			return Optional.of(preset);
		}
		return kakaoLocalClient.resolveLocationByKeyword(keyword);
	}

	private void syncFromKakaoIfNeeded(
			String keyword,
			Double latitude,
			Double longitude,
			int radiusMeters,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory
	) {
		if (!kakaoLocalClient.isConfigured()) {
			return;
		}
		if (keyword == null && (latitude == null || longitude == null)) {
			return;
		}

		String syncKey = "%s:%s:%s:%d:%s:%s".formatted(
				keyword != null ? keyword.toLowerCase(Locale.ROOT) : "coord",
				roundCoord(latitude),
				roundCoord(longitude),
				radiusMeters,
				categoryGroup != null ? categoryGroup.name() : "ALL",
				foodCategory != null ? foodCategory.name() : "ALL"
		);

		if (cacheStore.isRecentlySynced(syncKey)) {
			return;
		}

		List<KakaoPlaceCandidate> candidates = kakaoLocalClient.searchByKeyword(
				keyword,
				latitude,
				longitude,
				radiusMeters,
				categoryGroup,
				foodCategory
		);

		for (KakaoPlaceCandidate candidate : candidates) {
			upsertKakaoPlace(candidate);
		}
		if (!candidates.isEmpty()) {
			cacheStore.markSynced(syncKey);
		}
	}

	private void upsertKakaoPlace(KakaoPlaceCandidate candidate) {
		Optional<Place> existingOpt = placeRepository.findByExternalProviderAndExternalPlaceId(
				ExternalPlaceProvider.KAKAO,
				candidate.externalPlaceId()
		);

		if (existingOpt.isPresent()) {
			existingOpt.get().refreshBasicMetadata(
					candidate.name(),
					candidate.address(),
					candidate.regionKeyword(),
					candidate.latitude(),
					candidate.longitude(),
					candidate.phone(),
					candidate.placeUrl()
			);
			return;
		}

		Place created = Place.builder()
				.externalProvider(ExternalPlaceProvider.KAKAO)
				.externalPlaceId(candidate.externalPlaceId())
				.name(candidate.name())
				.categoryGroup(candidate.categoryGroup())
				.foodCategory(candidate.foodCategory())
				.subCategory(candidate.subCategory())
				.address(candidate.address())
				.regionKeyword(candidate.regionKeyword())
				.latitude(candidate.latitude())
				.longitude(candidate.longitude())
				.phone(candidate.phone())
				.placeUrl(candidate.placeUrl())
				.avgPricePerPerson(candidate.estimatedPricePerPerson())
				.isIndoor(candidate.isIndoor())
				.hashtags(candidate.initialHashtags())
				.recommendedMenus(List.of())
				.aiSummary(candidate.initialSummary())
				.build();

		placeRepository.save(created);
	}

	private static FoodCategory pickOptimalCategoryForBudget(Integer budgetPerPerson) {
		if (budgetPerPerson == null) {
			return FoodCategory.JAPANESE;
		}
		if (budgetPerPerson <= 14000) {
			return FoodCategory.SNACK;
		}
		if (budgetPerPerson <= 20000) {
			return FoodCategory.JAPANESE;
		}
		if (budgetPerPerson <= 25000) {
			return FoodCategory.KOREAN;
		}
		return FoodCategory.WESTERN;
	}

	private static String buildRecommendationReason(
			FoodCategory category,
			String subMenu,
			Integer budgetPerPerson,
			boolean hasMatches
	) {
		String budgetPhrase = (budgetPerPerson != null)
				? String.format("1인 예산 %,d원 이내로 ", budgetPerPerson)
				: "데이트 식사로 호불호 없이 ";

		if (!hasMatches) {
			return budgetPhrase + "즐기기 좋은 " + category.getLabel() + "(" + subMenu + ") 메뉴를 추천해요.";
		}
		return budgetPhrase + "분위기와 맛을 모두 챙기기 좋은 " + category.getLabel() + " '" + subMenu + "' 식당들을 골랐어요.";
	}

	@Transactional(readOnly = true)
	public List<PlaceDetailResponse> getActiveFestivals(
			Double minLat,
			Double maxLat,
			Double minLng,
			Double maxLng,
			int limit
	) {
		List<Place> festivals = placeQueryRepository.findActiveFestivalsInBounds(
				minLat, maxLat, minLng, maxLng, limit
		);
		return festivals.stream()
				.map(PlaceDetailResponse::from)
				.toList();
	}

	private static String buildSearchCacheKey(
			String keyword,
			Double latitude,
			Double longitude,
			int radiusMeters,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory,
			Integer maxPricePerPerson,
			Boolean isIndoor,
			int page,
			int size
	) {
		return "%s:%s:%s:%d:%s:%s:%s:%s:%d:%d".formatted(
				keyword != null ? keyword.toLowerCase(Locale.ROOT) : "_",
				roundCoord(latitude),
				roundCoord(longitude),
				radiusMeters,
				categoryGroup != null ? categoryGroup.name() : "_",
				foodCategory != null ? foodCategory.name() : "_",
				maxPricePerPerson != null ? maxPricePerPerson : "_",
				isIndoor != null ? isIndoor : "_",
				page,
				size
		);
	}

	private static String roundCoord(Double coord) {
		if (coord == null) {
			return "_";
		}
		return String.format(Locale.ROOT, "%.3f", coord);
	}
}

