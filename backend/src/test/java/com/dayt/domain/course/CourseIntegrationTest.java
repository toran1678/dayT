package com.dayt.domain.course;

import java.nio.charset.StandardCharsets;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
		"dayt.kakao-local.enabled=false",
		"dayt.ai-service.enabled=false",
		"dayt.google-places.enabled=false"
})
@Transactional
class CourseIntegrationTest {

	@Autowired
	private WebApplicationContext webApplicationContext;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
				.apply(springSecurity())
				.build();
	}

	@Test
	@DisplayName("[F-04 & F-05] 코스 생성·목록·상세(routePolyline)·공유 조회·수정·권한 검증·삭제 E2E 검증")
	void fullCourseCrudAndRoutePolylineFlow() throws Exception {
		String ownerToken = loginDevUser("dev:course_owner:성수메이커");
		String strangerToken = loginDevUser("dev:course_stranger:다른유저");

		// 1. 성수역 주변 시드 장소 3곳 조회
		MvcResult searchResult = mockMvc.perform(get("/api/v1/places/search")
						.param("keyword", "성수역")
						.param("radiusMeters", "2000"))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode searchItems = objectMapper
				.readTree(searchResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
				.get("items");
		assertThat(searchItems.size()).isGreaterThanOrEqualTo(3);

		long p1 = searchItems.get(0).get("id").asLong();
		long p2 = searchItems.get(1).get("id").asLong();
		long p3 = searchItems.get(2).get("id").asLong();

		// 2. 새 데이트 코스 생성 (POST /api/v1/courses)
		String createBody = """
				{
				  "title": "성수동 오후 전시 & 로스터리 루트",
				  "description": "식사 후 전시와 드립커피로 이어지는 깔끔한 도보 코스",
				  "themeTags": ["감성 카페", "전시·문화"],
				  "timeSlot": "HALF_DAY",
				  "datePlanDate": "2026-11-14",
				  "sourceType": "CUSTOM",
				  "shareWithCouple": false,
				  "places": [
				    {
				      "placeId": %d,
				      "visitOrder": 1,
				      "estimatedCost": 36000,
				      "stayMinutes": 60,
				      "travelMinutesToNext": 8,
				      "memo": "오픈런 추천"
				    },
				    {
				      "placeId": %d,
				      "visitOrder": 2,
				      "estimatedCost": 30000,
				      "stayMinutes": 90,
				      "travelMinutesToNext": 0,
				      "memo": "포토존 방문"
				    },
				    {
				      "placeId": %d,
				      "visitOrder": 3,
				      "estimatedCost": 24000,
				      "stayMinutes": 70,
				      "travelMinutesToNext": 15,
				      "memo": "핸드드립 주문"
				    }
				  ]
				}
				""".formatted(p1, p2, p3);

		MvcResult createResult = mockMvc.perform(post("/api/v1/courses")
						.header("Authorization", "Bearer " + ownerToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content(createBody))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.title").value("성수동 오후 전시 & 로스터리 루트"))
				.andExpect(jsonPath("$.datePlanDate").value("2026-11-14"))
				.andExpect(jsonPath("$.totalEstimatedCost").value(90000))
				.andExpect(jsonPath("$.places.length()").value(3))
				.andExpect(jsonPath("$.routePolyline.length()").value(3))
				.andExpect(jsonPath("$.places[2].travelMinutesToNext").value(0))
				.andReturn();

		JsonNode createdJson = objectMapper.readTree(
				createResult.getResponse().getContentAsString(StandardCharsets.UTF_8)
		);
		long courseId = createdJson.get("id").asLong();
		String shareToken = createdJson.get("shareToken").asText();
		int autoLeg2Minutes = createdJson.get("places").get(1).get("travelMinutesToNext").asInt();
		assertThat(autoLeg2Minutes).isGreaterThanOrEqualTo(1);
		assertThat(createdJson.get("totalDurationMinutes").asInt())
				.isEqualTo(60 + 90 + 70 + 8 + autoLeg2Minutes);

		// 3. 내 코스 목록 조회 (GET /api/v1/courses)
		mockMvc.perform(get("/api/v1/courses")
						.header("Authorization", "Bearer " + ownerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(courseId))
				.andExpect(jsonPath("$[0].placeCount").value(3));

		// 4. 공유 토큰 비로그인 상세 조회 (GET /api/v1/courses/shared/{shareToken})
		mockMvc.perform(get("/api/v1/courses/shared/{shareToken}", shareToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(courseId))
				.andExpect(jsonPath("$.routePolyline.length()").value(3));

		// 4-B. [F-10] 스마트폰 구글맵 원클릭 길안내 Deep Link 생성 (GET /api/v1/courses/{courseId}/google-maps-link)
		MvcResult mapsLinkRes = mockMvc.perform(get("/api/v1/courses/{courseId}/google-maps-link", courseId)
						.header("Authorization", "Bearer " + ownerToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deepLinkUrl").isNotEmpty())
				.andExpect(jsonPath("$.webFallbackUrl").isNotEmpty())
				.andReturn();

		JsonNode mapsLinkJson = objectMapper.readTree(
				mapsLinkRes.getResponse().getContentAsString(StandardCharsets.UTF_8)
		);
		assertThat(mapsLinkJson.get("deepLinkUrl").asText()).startsWith("comgooglemaps://");
		assertThat(mapsLinkJson.get("webFallbackUrl").asText())
				.startsWith("https://www.google.com/maps/dir/?api=1")
				.contains("waypoints=");

		// 4-C. [F-11] 구글 내 지도(My Maps) KML 다운로드 검증 (GET /api/v1/courses/{courseId}/export.kml)
		MvcResult kmlRes = mockMvc.perform(get("/api/v1/courses/{courseId}/export.kml", courseId)
						.header("Authorization", "Bearer " + ownerToken))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/vnd.google-earth.kml+xml")))
				.andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("dayt-course-" + courseId + ".kml")))
				.andReturn();

		String kmlContent = kmlRes.getResponse().getContentAsString(StandardCharsets.UTF_8);
		assertThat(kmlContent)
				.contains("<kml xmlns=\"http://www.opengis.net/kml/2.2\">")
				.contains("<name>성수동 오후 전시 &amp; 로스터리 루트</name>")
				.contains("<Placemark>")
				.contains("<LineString>");

		// 5. 제3자 비공개 코스 조회/수정/삭제 시 403 Forbidden 검증
		mockMvc.perform(get("/api/v1/courses/{courseId}", courseId)
						.header("Authorization", "Bearer " + strangerToken))
				.andExpect(status().isForbidden());

		// 5-B. [F-13] 공동 편집 ON(PATCH /collaboration) 시 공동 조회 허용 & 삭제는 여전히 소유자만 가능 검증
		mockMvc.perform(patch("/api/v1/courses/{courseId}/collaboration", courseId)
						.header("Authorization", "Bearer " + ownerToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"isCollabOpen\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.isCollabOpen").value(true));

		mockMvc.perform(get("/api/v1/courses/{courseId}", courseId)
						.header("Authorization", "Bearer " + strangerToken))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/v1/courses/{courseId}", courseId)
						.header("Authorization", "Bearer " + strangerToken))
				.andExpect(status().isForbidden());

		// 6. 작성자 코스 순서·예산 수정 (PUT /api/v1/courses/{courseId})
		String updateBody = """
				{
				  "title": "성수동 저녁 산책 & 다이닝 코스",
				  "description": "순서를 바꿔 저녁 시간대에 맞춘 코스",
				  "themeTags": ["맛집 투어", "산책·야외"],
				  "timeSlot": "EVENING",
				  "sourceType": "CUSTOM",
				  "shareWithCouple": false,
				  "places": [
				    {
				      "placeId": %d,
				      "visitOrder": 1,
				      "estimatedCost": 28000,
				      "stayMinutes": 50,
				      "travelMinutesToNext": 10,
				      "memo": "커피 먼저"
				    },
				    {
				      "placeId": %d,
				      "visitOrder": 2,
				      "estimatedCost": 42000,
				      "stayMinutes": 80,
				      "travelMinutesToNext": 0,
				      "memo": "저녁 식사"
				    }
				  ]
				}
				""".formatted(p3, p1);

		mockMvc.perform(put("/api/v1/courses/{courseId}", courseId)
						.header("Authorization", "Bearer " + ownerToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content(updateBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("성수동 저녁 산책 & 다이닝 코스"))
				.andExpect(jsonPath("$.timeSlot").value("EVENING"))
				.andExpect(jsonPath("$.totalEstimatedCost").value(70000))
				.andExpect(jsonPath("$.totalDurationMinutes").value(140))
				.andExpect(jsonPath("$.places.length()").value(2))
				.andExpect(jsonPath("$.places[0].place.id").value(p3))
				.andExpect(jsonPath("$.places[1].place.id").value(p1))
				.andExpect(jsonPath("$.routePolyline.length()").value(2));

		// 7. 작성자 코스 삭제 (DELETE /api/v1/courses/{courseId}) -> 204 & 이후 404
		mockMvc.perform(delete("/api/v1/courses/{courseId}", courseId)
						.header("Authorization", "Bearer " + ownerToken))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/courses/{courseId}", courseId)
						.header("Authorization", "Bearer " + ownerToken))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("[F-06] 조건 맞춤 AI 데이트 코스 추천 프리뷰 생성 검증")
	void recommendCoursePreviewFlow() throws Exception {
		String token = loginDevUser("dev:ai_recommender:AI테스터");

		String recommendBody = """
				{
				  "regionKeyword": "성수역",
				  "themeTags": ["감성 카페", "전시·문화"],
				  "foodCategories": ["일식", "양식"],
				  "budgetPerPerson": 40000,
				  "timeSlot": "HALF_DAY",
				  "moodKeywords": ["비 오는 날", "아늑한 분위기"]
				}
				""";

		mockMvc.perform(post("/api/v1/courses/recommend")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(recommendBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.suggestedTitle").isNotEmpty())
				.andExpect(jsonPath("$.aiReason").isNotEmpty())
				.andExpect(jsonPath("$.totalEstimatedCost").isNumber())
				.andExpect(jsonPath("$.totalDurationMinutes").isNumber())
				.andExpect(jsonPath("$.places").isNotEmpty())
				.andExpect(jsonPath("$.routePolyline").isNotEmpty());
	}

	private String loginDevUser(String devAuthCode) throws Exception {
		String body = """
				{
				  "authorizationCode": "%s"
				}
				""".formatted(devAuthCode);

		MvcResult res = mockMvc.perform(post("/api/v1/auth/oauth/KAKAO")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode json = objectMapper.readTree(res.getResponse().getContentAsString(StandardCharsets.UTF_8));
		return json.get("accessToken").asText();
	}
}

