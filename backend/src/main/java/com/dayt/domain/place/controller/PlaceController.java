package com.dayt.domain.place.controller;

import com.dayt.domain.place.dto.FoodRecommendationResponse;
import com.dayt.domain.place.dto.PlaceDetailResponse;
import com.dayt.domain.place.dto.PlaceSearchListResponse;
import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import com.dayt.domain.place.service.PlaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Places", description = "지역·카테고리 장소 탐색 및 음식 추천")
@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlaceController {

	private final PlaceService placeService;
	private final com.dayt.domain.place.service.TourApiFestivalSyncService tourApiFestivalSyncService;

	@Operation(summary = "지역·카테고리·예산 기반 장소 탐색")
	@GetMapping("/search")
	public ResponseEntity<PlaceSearchListResponse> searchPlaces(
			@RequestParam(name = "keyword", required = false) String keyword,
			@RequestParam(name = "latitude", required = false) Double latitude,
			@RequestParam(name = "longitude", required = false) Double longitude,
			@RequestParam(name = "radiusMeters", defaultValue = "1500") int radiusMeters,
			@RequestParam(name = "categoryGroup", required = false) PlaceCategoryGroup categoryGroup,
			@RequestParam(name = "foodCategory", required = false) FoodCategory foodCategory,
			@RequestParam(name = "maxPricePerPerson", required = false) Integer maxPricePerPerson,
			@RequestParam(name = "isIndoor", required = false) Boolean isIndoor,
			@RequestParam(name = "page", defaultValue = "0") int page,
			@RequestParam(name = "size", defaultValue = "20") int size) {
		return ResponseEntity.ok(placeService.searchPlaces(
				keyword,
				latitude,
				longitude,
				radiusMeters,
				categoryGroup,
				foodCategory,
				maxPricePerPerson,
				isIndoor,
				page,
				size));
	}

	@Operation(summary = "취향·예산 기반 음식 메뉴 및 주변 식당 추천")
	@GetMapping("/foods/recommend")
	public ResponseEntity<FoodRecommendationResponse> recommendFoods(
			@RequestParam(name = "foodCategory", required = false) FoodCategory foodCategory,
			@RequestParam(name = "latitude", required = false) Double latitude,
			@RequestParam(name = "longitude", required = false) Double longitude,
			@RequestParam(name = "budgetPerPerson", required = false) Integer budgetPerPerson) {
		return ResponseEntity.ok(placeService.recommendFoods(
				foodCategory,
				latitude,
				longitude,
				budgetPerPerson));
	}

	@Operation(summary = "장소 상세 정보 및 AI 해시태그 요약 조회")
	@GetMapping("/{placeId}")
	public ResponseEntity<PlaceDetailResponse> getPlaceDetail(@PathVariable("placeId") Long placeId) {
		return ResponseEntity.ok(placeService.getPlaceDetail(placeId));
	}

	@Operation(summary = "진행 중/예정된 행사·축제 지도 바운드/전국 조회")
	@GetMapping("/festivals")
	public ResponseEntity<java.util.List<PlaceDetailResponse>> getActiveFestivals(
			@RequestParam(name = "minLat", required = false) Double minLat,
			@RequestParam(name = "maxLat", required = false) Double maxLat,
			@RequestParam(name = "minLng", required = false) Double minLng,
			@RequestParam(name = "maxLng", required = false) Double maxLng,
			@RequestParam(name = "limit", defaultValue = "500") int limit) {
		return ResponseEntity.ok(placeService.getActiveFestivals(minLat, maxLat, minLng, maxLng, limit));
	}

	@Operation(summary = "한국관광공사 TourAPI 최신 전국 축제 데이터 수집 동기화")
	@org.springframework.web.bind.annotation.PostMapping("/festivals/sync")
	public ResponseEntity<java.util.Map<String, Object>> syncFestivals(
			@RequestParam(name = "year", defaultValue = "2026") int year) {
		int count = tourApiFestivalSyncService.syncAllFestivals(year);
		return ResponseEntity.ok(java.util.Map.of(
				"status", "SUCCESS",
				"syncedCount", count,
				"message", count + "개의 전국 축제 데이터를 성공적으로 동기화했습니다."));
	}
}
