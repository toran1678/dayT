package com.dayt.domain.place;

import java.nio.charset.StandardCharsets;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
		"dayt.kakao-local.enabled=false",
		"dayt.ai-service.enabled=false",
		"dayt.google-places.enabled=false"
})
@Transactional
class PlaceIntegrationTest {

	@Autowired
	private WebApplicationContext webApplicationContext;

	@Autowired
	private StringRedisTemplate redisTemplate;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
				.apply(springSecurity())
				.build();
		var keys = redisTemplate.keys("dayt:places:*");
		if (keys != null && !keys.isEmpty()) {
			redisTemplate.delete(keys);
		}
	}

	@Test
	@DisplayName("[F-02] 역 키워드 기반 PostGIS 반경 장소 탐색 및 상세 조회 검증")
	void searchSeongsuPlacesAndGetDetail() throws Exception {
		MvcResult searchResult = mockMvc.perform(get("/api/v1/places/search")
						.param("keyword", "성수역")
						.param("radiusMeters", "2000")
						.param("page", "0")
						.param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items").isArray())
				.andExpect(jsonPath("$.items.length()").isNumber())
				.andExpect(jsonPath("$.page").value(0))
				.andReturn();

		JsonNode json = objectMapper.readTree(searchResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
		JsonNode items = json.get("items");
		assertThat(items.size()).isGreaterThanOrEqualTo(4);

		// 성수역 반경 2km 내 결과에는 연남동/강남역 시드가 포함되지 않아야 함
		for (JsonNode item : items) {
			assertThat(item.get("address").asText()).contains("성동구");
		}

		long firstPlaceId = items.get(0).get("id").asLong();

		// 상세 조회 (GET /api/v1/places/{placeId})
		mockMvc.perform(get("/api/v1/places/{placeId}", firstPlaceId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(firstPlaceId))
				.andExpect(jsonPath("$.hashtags").isArray())
				.andExpect(jsonPath("$.recommendedMenus").isArray());
	}

	@Test
	@DisplayName("[F-02] 한글 음식 카테고리·예산·실내 필터 조합 검색 검증")
	void searchWithKoreanFoodCategoryAndBudget() throws Exception {
		mockMvc.perform(get("/api/v1/places/search")
						.param("keyword", "연남동")
						.param("categoryGroup", "RESTAURANT")
						.param("foodCategory", "일식")
						.param("maxPricePerPerson", "18000")
						.param("isIndoor", "true"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].name").value("연남 카미나리 텐동"))
				.andExpect(jsonPath("$.items[0].foodCategory").value("일식"));
	}

	@Test
	@DisplayName("[F-03] 취향 및 예산 기반 음식 메뉴 & 주변 식당 추천 검증")
	void recommendFoodsByCategoryAndBudget() throws Exception {
		MvcResult recResult = mockMvc.perform(get("/api/v1/places/foods/recommend")
						.param("foodCategory", "양식")
						.param("latitude", "37.54458")
						.param("longitude", "127.05597")
						.param("budgetPerPerson", "30000"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.recommendedFoodCategory").value("양식"))
				.andExpect(jsonPath("$.recommendedSubMenu").isNotEmpty())
				.andExpect(jsonPath("$.reason").isNotEmpty())
				.andExpect(jsonPath("$.places").isNotEmpty())
				.andReturn();

		JsonNode placesNode = objectMapper
				.readTree(recResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
				.get("places");
		for (JsonNode placeNode : placesNode) {
			assertThat(placeNode.get("categoryGroup").asText()).isEqualTo("RESTAURANT");
			assertThat(placeNode.get("foodCategory").asText()).isEqualTo("양식");
			assertThat(placeNode.get("address").asText()).contains("서울");
			JsonNode priceNode = placeNode.get("avgPricePerPerson");
			if (priceNode != null && !priceNode.isNull()) {
				assertThat(priceNode.asInt()).isLessThanOrEqualTo(30000);
			}
		}
	}

	@Test
	@DisplayName("[F-02] 존재하지 않는 장소 ID 조회 시 404, 허용 반경 이탈 시 400 반환")
	void errorHandlingForNotFoundAndInvalidRadius() throws Exception {
		mockMvc.perform(get("/api/v1/places/{placeId}", 999999L))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("NOT_FOUND"));

		mockMvc.perform(get("/api/v1/places/search")
						.param("radiusMeters", "50"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("INVALID_INPUT"));
	}
}

