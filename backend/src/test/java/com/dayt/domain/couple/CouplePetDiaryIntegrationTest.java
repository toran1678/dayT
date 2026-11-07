package com.dayt.domain.couple;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
		"dayt.kakao-local.enabled=false",
		"dayt.ai-service.enabled=false",
		"dayt.google-places.enabled=false"
})
@Transactional
class CouplePetDiaryIntegrationTest {

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
	@DisplayName("[F-14] 커플 초대·연결 → 커플 펫 조회·만남 인증(중복 409)·일일 미션 완료 → 데이트 일기장 공유 CRUD E2E")
	void fullCouplePetMissionAndDiaryFlow() throws Exception {
		AuthSession partnerA = loginDevUser("dev:couple_partner_a");
		AuthSession partnerB = loginDevUser("dev:couple_partner_b");
		AuthSession outsider = loginDevUser("dev:couple_outsider");
		String partnerAToken = partnerA.accessToken();
		String partnerBToken = partnerB.accessToken();
		String outsiderToken = outsider.accessToken();

		// 1. 연결 전 펫 조회 시 404 반환 검증
		mockMvc.perform(get("/api/v1/pets/me")
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isNotFound());

		// 2. 파트너 A 초대 코드 발급 (POST /api/v1/couples/invite)
		MvcResult inviteRes = mockMvc.perform(post("/api/v1/couples/invite")
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.inviteCode").isNotEmpty())
				.andReturn();

		JsonNode inviteJson = objectMapper.readTree(
				inviteRes.getResponse().getContentAsString(StandardCharsets.UTF_8)
		);
		long coupleId = inviteJson.get("coupleId").asLong();
		String inviteCode = inviteJson.get("inviteCode").asText();
		assertThat(inviteCode).hasSize(6);

		// 본인 코드로 연결 시도 시 400 방지 검증
		mockMvc.perform(post("/api/v1/couples/connect")
						.header("Authorization", "Bearer " + partnerAToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"inviteCode\":\"" + inviteCode + "\"}"))
				.andExpect(status().isBadRequest());

		// 3. 파트너 B가 초대 코드로 커플 연결 확정 (POST /api/v1/couples/connect)
		String connectBody = """
				{
				  "inviteCode": "%s",
				  "startedDate": "2025-05-10"
				}
				""".formatted(inviteCode);

		mockMvc.perform(post("/api/v1/couples/connect")
						.header("Authorization", "Bearer " + partnerBToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content(connectBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(coupleId))
				.andExpect(jsonPath("$.status").value("CONNECTED"))
				.andExpect(jsonPath("$.startedDate").value("2025-05-10"))
				.andExpect(jsonPath("$.partnerNickname").value(partnerA.nickname()));

		// 내 프로필에 coupleId가 즉시 반영되었는지 검증
		mockMvc.perform(get("/api/v1/users/me")
						.header("Authorization", "Bearer " + partnerBToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.coupleId").value(coupleId));

		// 4. 커플 펫 상태 조회 & 오늘의 만남 인증 (GET /api/v1/pets/me, POST /api/v1/pets/check-in)
		MvcResult petBeforeRes = mockMvc.perform(get("/api/v1/pets/me")
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.coupleId").value(coupleId))
				.andExpect(jsonPath("$.level").value(1))
				.andReturn();
		int expBeforeCheckIn = objectMapper.readTree(
				petBeforeRes.getResponse().getContentAsString(StandardCharsets.UTF_8)
		).get("exp").asInt();

		mockMvc.perform(post("/api/v1/pets/check-in")
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalMeetDays").value(1))
				.andExpect(jsonPath("$.exp").value(expBeforeCheckIn + 20));

		// 같은 날 파트너 B가 중복 만남 인증 시 409 CONFLICT 검증
		mockMvc.perform(post("/api/v1/pets/check-in")
						.header("Authorization", "Bearer " + partnerBToken))
				.andExpect(status().isConflict());

		// 5. 오늘의 성장 미션 조회 및 완료 시 경험치 적립 검증
		MvcResult missionsRes = mockMvc.perform(get("/api/v1/missions/today")
						.header("Authorization", "Bearer " + partnerBToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(3))
				.andReturn();

		JsonNode missionsJson = objectMapper.readTree(
				missionsRes.getResponse().getContentAsString(StandardCharsets.UTF_8)
		);
		long firstMissionLogId = missionsJson.get(0).get("missionLogId").asLong();
		int missionRewardExp = missionsJson.get(0).get("rewardExp").asInt();

		mockMvc.perform(post("/api/v1/missions/{missionLogId}/complete", firstMissionLogId)
						.header("Authorization", "Bearer " + partnerBToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.isCompleted").value(true))
				.andExpect(jsonPath("$.completedAt").isNotEmpty());

		mockMvc.perform(get("/api/v1/pets/me")
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.exp").value(expBeforeCheckIn + 20 + missionRewardExp));

		// 6. 데이트 일기 작성(파트너 A) → 파트너 B 공유 조회·수정 → 외부인 차단(403) → 삭제(204)
		String createDiaryBody = """
				{
				  "dateAt": "2026-11-07",
				  "title": "성수동 전시 보고 노을 보며 커피 마신 날",
				  "content": "동선도 여유롭고 로스터리 필터 커피 향이 정말 좋았던 오후!",
				  "courseId": null,
				  "imageUrls": [
				    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
				    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600"
				  ]
				}
				""";

		MvcResult createdDiaryRes = mockMvc.perform(post("/api/v1/diaries")
						.header("Authorization", "Bearer " + partnerAToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content(createDiaryBody))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.coupleId").value(coupleId))
				.andExpect(jsonPath("$.title").value("성수동 전시 보고 노을 보며 커피 마신 날"))
				.andExpect(jsonPath("$.imageUrls.length()").value(2))
				.andReturn();

		long diaryId = objectMapper.readTree(
				createdDiaryRes.getResponse().getContentAsString(StandardCharsets.UTF_8)
		).get("id").asLong();

		// 파트너 B가 일기 목록에서 함께 조회 가능한지 검증
		mockMvc.perform(get("/api/v1/diaries")
						.header("Authorization", "Bearer " + partnerBToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(diaryId));

		// 외부 유저는 조회 불가(403) 검증
		mockMvc.perform(get("/api/v1/diaries/{diaryId}", diaryId)
						.header("Authorization", "Bearer " + outsiderToken))
				.andExpect(status().isForbidden());

		// 파트너 B가 감상 덧붙여 수정 (PUT /api/v1/diaries/{diaryId})
		String updateDiaryBody = """
				{
				  "dateAt": "2026-11-07",
				  "title": "성수동 전시 보고 노을 보며 커피 마신 완벽한 하루",
				  "content": "동선도 여유롭고 저녁 산책까지 완벽했던 날!",
				  "courseId": null,
				  "imageUrls": [
				    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600"
				  ]
				}
				""";

		mockMvc.perform(put("/api/v1/diaries/{diaryId}", diaryId)
						.header("Authorization", "Bearer " + partnerBToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content(updateDiaryBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("성수동 전시 보고 노을 보며 커피 마신 완벽한 하루"))
				.andExpect(jsonPath("$.imageUrls.length()").value(1));

		// 삭제 후 404 검증
		mockMvc.perform(delete("/api/v1/diaries/{diaryId}", diaryId)
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/diaries/{diaryId}", diaryId)
						.header("Authorization", "Bearer " + partnerAToken))
				.andExpect(status().isNotFound());
	}

	private AuthSession loginDevUser(String devAuthCode) throws Exception {
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
		return new AuthSession(
				json.get("accessToken").asText(),
				json.get("user").get("nickname").asText()
		);
	}

	private record AuthSession(String accessToken, String nickname) {
	}
}
