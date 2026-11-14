package com.dayt.domain.place.service;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.dayt.domain.place.entity.ExternalPlaceProvider;
import com.dayt.domain.place.entity.Place;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import com.dayt.domain.place.repository.PlaceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
@Order(100)
public class TourApiFestivalSyncService implements ApplicationRunner {

	private static final String TOUR_API_FESTIVAL_URL = "https://apis.data.go.kr/B551011/KorService2/searchFestival2";
	private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

	private final PlaceRepository placeRepository;
	private final ObjectMapper objectMapper = new ObjectMapper();
	private final RestClient restClient;
	private final String serviceKey;

	public TourApiFestivalSyncService(
			PlaceRepository placeRepository,
			@Value("${dayt.tour-api.service-key:}") String serviceKey) {
		this.placeRepository = placeRepository;
		this.serviceKey = serviceKey != null ? serviceKey.trim() : "";
		this.restClient = RestClient.builder().build();
	}

	public boolean isConfigured() {
		return !serviceKey.isBlank() && !serviceKey.startsWith("your_");
	}

	@Override
	public void run(ApplicationArguments args) {
		if (!isConfigured()) {
			log.info(
					"[TourAPI Sync] TOUR_API_SERVICE_KEY is not configured or placeholder. Skipping startup festival sync.");
			return;
		}

		// Auto-sync on startup if festival count is small (e.g. initial seed only)
		long count = placeRepository.countByExternalProvider(ExternalPlaceProvider.TOUR_API);
		log.info("[TourAPI Sync] Current TOUR_API place count in DB: {}", count);
		if (count < 20) {
			log.info(
					"[TourAPI Sync] Festival places in DB are fewer than 20. Initiating automatic TourAPI KorService2 sync...");
			try {
				int synced = syncAllFestivals(2026);
				log.info("[TourAPI Sync] Completed startup TourAPI festival sync. Synced {} places.", synced);
			} catch (Exception e) {
				log.error("[TourAPI Sync] Startup festival sync encountered error: {}", e.getMessage(), e);
			}
		}
	}

	@Transactional
	public int syncAllFestivals(int targetYear) {
		if (!isConfigured()) {
			log.warn("[TourAPI Sync] Cannot sync festivals: TOUR_API_SERVICE_KEY is empty.");
			return 0;
		}

		String decodedKey;
		try {
			decodedKey = URLDecoder.decode(serviceKey, StandardCharsets.UTF_8);
		} catch (Exception e) {
			decodedKey = serviceKey;
		}

		String eventStartDate = String.format("%04d0101", targetYear);
		int pageNo = 1;
		int numOfRows = 100;
		int totalSynced = 0;
		int maxPages = 10; // Up to 1,000 festivals

		log.info("[TourAPI Sync] Starting festival sync from KorService2 for year {} (eventStartDate={})", targetYear,
				eventStartDate);

		while (pageNo <= maxPages) {
			try {
				String requestUrl = UriComponentsBuilder.fromUriString(TOUR_API_FESTIVAL_URL)
						.queryParam("serviceKey", decodedKey)
						.queryParam("MobileOS", "ETC")
						.queryParam("MobileApp", "DayT")
						.queryParam("_type", "json")
						.queryParam("eventStartDate", eventStartDate)
						.queryParam("numOfRows", numOfRows)
						.queryParam("pageNo", pageNo)
						.build(true)
						.toUriString();

				String rawJson = restClient.get()
						.uri(requestUrl)
						.retrieve()
						.body(String.class);

				if (rawJson == null || rawJson.isBlank()) {
					log.warn("[TourAPI Sync] Empty response on page {}", pageNo);
					break;
				}

				JsonNode root = objectMapper.readTree(rawJson);
				JsonNode headerNode = root.path("response").path("header");
				String resultCode = headerNode.path("resultCode").asText("");
				if (!"0000".equals(resultCode)) {
					log.error("[TourAPI Sync] Error from TourAPI: resultCode={}, resultMsg={}",
							resultCode, headerNode.path("resultMsg").asText(""));
					break;
				}

				JsonNode bodyNode = root.path("response").path("body");
				int totalCount = bodyNode.path("totalCount").asInt(0);
				JsonNode itemNode = bodyNode.path("items").path("item");

				if (itemNode.isMissingNode() || itemNode.isNull()) {
					break;
				}

				List<JsonNode> items = new ArrayList<>();
				if (itemNode.isArray()) {
					itemNode.forEach(items::add);
				} else if (itemNode.isObject()) {
					items.add(itemNode);
				}

				if (items.isEmpty()) {
					break;
				}

				for (JsonNode item : items) {
					boolean processed = processAndUpsertFestival(item);
					if (processed) {
						totalSynced++;
					}
				}

				log.info("[TourAPI Sync] Page {} processed ({}/{} items, totalCount: {})",
						pageNo, items.size(), totalSynced, totalCount);

				if (pageNo * numOfRows >= totalCount) {
					break;
				}
				pageNo++;
			} catch (Exception e) {
				log.error("[TourAPI Sync] Failed to fetch page {}: {}", pageNo, e.getMessage());
				break;
			}
		}

		// Also fix existing seed festivals that had visitkorea.or.kr home URL to
		// official KakaoMap map pins
		updateExistingSeedFestivalUrls();

		log.info("[TourAPI Sync] Festival sync finished successfully. Total synced/updated: {}", totalSynced);
		return totalSynced;
	}

	private boolean processAndUpsertFestival(JsonNode item) {
		String contentId = item.path("contentid").asText("").trim();
		String title = item.path("title").asText("").trim();
		String addr = item.path("addr1").asText("").trim();
		String mapx = item.path("mapx").asText("").trim();
		String mapy = item.path("mapy").asText("").trim();
		String sDateStr = item.path("eventstartdate").asText("").trim();
		String eDateStr = item.path("eventenddate").asText("").trim();
		String tel = item.path("tel").asText("").trim();
		String firstImage = item.path("firstimage").asText("").trim();

		if (contentId.isBlank() || title.isBlank() || mapx.isBlank() || mapy.isBlank()) {
			return false;
		}

		double longitude;
		double latitude;
		try {
			longitude = Double.parseDouble(mapx);
			latitude = Double.parseDouble(mapy);
		} catch (NumberFormatException e) {
			return false;
		}

		if (longitude < 124.0 || longitude > 132.0 || latitude < 33.0 || latitude > 39.0) {
			return false; // Outside Korea coordinate bounds
		}

		LocalDate startDate = null;
		LocalDate endDate = null;
		try {
			if (sDateStr.length() == 8) {
				startDate = LocalDate.parse(sDateStr, DATE_FMT);
			}
			if (eDateStr.length() == 8) {
				endDate = LocalDate.parse(eDateStr, DATE_FMT);
			}
		} catch (Exception ignored) {
		}

		// Extract region keyword from address (e.g. "서울 송파구", "울산 남구", "경남 김해시")
		String regionKeyword = "국내축제";
		if (!addr.isBlank()) {
			String[] tokens = addr.split("\\s+");
			if (tokens.length >= 2) {
				regionKeyword = tokens[0] + " " + tokens[1];
			} else if (tokens.length == 1) {
				regionKeyword = tokens[0];
			}
		}

		// KakaoMap official pinpoint scheme:
		// https://map.kakao.com/link/map/{name},{latitude},{longitude}
		// Renders pinpoint marker with custom title directly in KakaoMap app or
		// mobile/desktop web
		String encodedTitle = URLEncoder.encode(title, StandardCharsets.UTF_8);
		String kakaoMapPinUrl = String.format(
				"https://map.kakao.com/link/map/%s,%.6f,%.6f",
				encodedTitle, latitude, longitude);

		String externalPlaceId = "tour_" + contentId;
		Optional<Place> existingOpt = placeRepository.findByExternalProviderAndExternalPlaceId(
				ExternalPlaceProvider.TOUR_API,
				externalPlaceId);

		String aiSummary = String.format(
				"%s에서 개최되는 축제 '%s'예요.%s",
				addr.isBlank() ? regionKeyword : addr,
				title,
				(startDate != null && endDate != null)
						? String.format(" (기간: %s ~ %s)", startDate, endDate)
						: "");

		List<String> hashtags = List.of(
				"#전국축제",
				"#데이트행사",
				"#" + regionKeyword.replace(" ", ""),
				"#TourAPI");

		if (existingOpt.isPresent()) {
			Place place = existingOpt.get();
			place.updateFestivalInfo(
					title,
					addr.isBlank() ? regionKeyword : addr,
					regionKeyword,
					latitude,
					longitude,
					tel.isBlank() ? null : tel,
					kakaoMapPinUrl,
					firstImage.isBlank() ? null : firstImage,
					startDate,
					endDate);
		} else {
			Place place = Place.builder()
					.externalProvider(ExternalPlaceProvider.TOUR_API)
					.externalPlaceId(externalPlaceId)
					.name(title)
					.categoryGroup(PlaceCategoryGroup.EXHIBITION)
					.foodCategory(null)
					.subCategory("축제·행사")
					.address(addr.isBlank() ? regionKeyword : addr)
					.regionKeyword(regionKeyword)
					.latitude(latitude)
					.longitude(longitude)
					.phone(tel.isBlank() ? null : tel)
					.placeUrl(kakaoMapPinUrl)
					.thumbnailUrl(firstImage.isBlank() ? null : firstImage)
					.avgPricePerPerson(0)
					.isIndoor(false)
					.hashtags(hashtags)
					.recommendedMenus(List.of())
					.aiSummary(aiSummary)
					.eventStartDate(startDate)
					.eventEndDate(endDate)
					.build();

			placeRepository.save(place);
		}

		return true;
	}

	private void updateExistingSeedFestivalUrls() {
		List<Place> existingTourPlaces = placeRepository.findAllByExternalProvider(ExternalPlaceProvider.TOUR_API);
		for (Place p : existingTourPlaces) {
			if (p.getPlaceUrl() == null || p.getPlaceUrl().contains("visitkorea.or.kr")) {
				String encoded = URLEncoder.encode(p.getName(), StandardCharsets.UTF_8);
				String kakaoMapPinUrl = String.format(
						"https://map.kakao.com/link/map/%s,%.6f,%.6f",
						encoded, p.getLatitude(), p.getLongitude());
				p.updateFestivalInfo(
						p.getName(),
						p.getAddress(),
						p.getRegionKeyword(),
						p.getLatitude(),
						p.getLongitude(),
						p.getPhone(),
						kakaoMapPinUrl,
						p.getThumbnailUrl(),
						p.getEventStartDate(),
						p.getEventEndDate());
			}
		}
	}
}
