package com.dayt.domain.auth;

import java.nio.charset.StandardCharsets;

import com.dayt.domain.auth.token.RefreshTokenStore;
import com.dayt.domain.user.repository.UserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
		"dayt.oauth.dev-mock-enabled=true"
})
@Transactional
class AuthAndUserIntegrationTest {

	@Autowired
	private WebApplicationContext webApplicationContext;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private RefreshTokenStore refreshTokenStore;

	private final ObjectMapper objectMapper = new ObjectMapper();
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
				.apply(springSecurity())
				.build();
	}

	@Test
	@DisplayName("[F-01] 소셜 로그인 -> 내 정보 조회/수정 -> 토큰 재발급 -> 로그아웃 전체 흐름 검증")
	void fullAuthAndUserLifecycle() throws Exception {
		// 1. 카카오 소셜 로그인 (신규 회원 자동 가입 + JWT 발급)
		MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/oauth/KAKAO")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "authorizationCode": "dev:test_runner"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.refreshToken").isNotEmpty())
				.andExpect(jsonPath("$.user.id").isNumber())
				.andExpect(jsonPath("$.user.oauthProvider").value("KAKAO"))
				.andExpect(jsonPath("$.user.nickname").value("카카오 데이터 (test_runner)"))
				.andExpect(jsonPath("$.user.coupleId").isEmpty())
				.andReturn();

		JsonNode loginJson = objectMapper.readTree(loginResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
		String accessToken = loginJson.get("accessToken").asText();
		String refreshToken = loginJson.get("refreshToken").asText();
		long userId = loginJson.get("user").get("id").asLong();

		try {
			assertThat(userRepository.findById(userId)).isPresent();
			assertThat(refreshTokenStore.findByUserId(userId)).contains(refreshToken);

			// 2. 내 프로필 조회 (GET /api/v1/users/me)
			mockMvc.perform(get("/api/v1/users/me")
							.header("Authorization", "Bearer " + accessToken))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.id").value(userId))
					.andExpect(jsonPath("$.email").value("kakao.test_runner@dayt.local"))
					.andExpect(jsonPath("$.nickname").value("카카오 데이터 (test_runner)"));

			// 3. 리프레시 토큰을 Access Token 자리에 오용 시 401 차단 검증
			mockMvc.perform(get("/api/v1/users/me")
							.header("Authorization", "Bearer " + refreshToken))
					.andExpect(status().isUnauthorized())
					.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

			// 4. 내 프로필 수정 (PATCH /api/v1/users/me)
			mockMvc.perform(patch("/api/v1/users/me")
							.header("Authorization", "Bearer " + accessToken)
							.contentType(MediaType.APPLICATION_JSON)
							.content("""
									{
									  "nickname": "성수동데이트장인",
									  "profileImageUrl": "https://example.com/avatar.png"
									}
									"""))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.nickname").value("성수동데이트장인"))
					.andExpect(jsonPath("$.profileImageUrl").value("https://example.com/avatar.png"));

			// 5. 토큰 재발급 (POST /api/v1/auth/refresh) -> 새 토큰 발급 및 이전 리프레시 토큰 무효화
			MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
							.contentType(MediaType.APPLICATION_JSON)
							.content("""
									{
									  "refreshToken": "%s"
									}
									""".formatted(refreshToken)))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.accessToken").isNotEmpty())
					.andExpect(jsonPath("$.refreshToken").isNotEmpty())
					.andExpect(jsonPath("$.user.nickname").value("성수동데이트장인"))
					.andReturn();

			JsonNode refreshJson = objectMapper.readTree(refreshResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
			String rotatedAccessToken = refreshJson.get("accessToken").asText();
			String rotatedRefreshToken = refreshJson.get("refreshToken").asText();
			assertThat(rotatedRefreshToken).isNotEqualTo(refreshToken);

			// 이전 리프레시 토큰 재사용 시 401 반환 및 세션 폐기 검증 전에 정상 로그아웃부터 테스트
			// 6. 로그아웃 (POST /api/v1/auth/logout -> 204)
			mockMvc.perform(post("/api/v1/auth/logout")
							.header("Authorization", "Bearer " + rotatedAccessToken))
					.andExpect(status().isNoContent());

			assertThat(refreshTokenStore.findByUserId(userId)).isEmpty();

			// 7. 로그아웃 이후 리프레시 시도 시 401 반환
			mockMvc.perform(post("/api/v1/auth/refresh")
							.contentType(MediaType.APPLICATION_JSON)
							.content("""
									{
									  "refreshToken": "%s"
									}
									""".formatted(rotatedRefreshToken)))
					.andExpect(status().isUnauthorized())
					.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
		}
		finally {
			refreshTokenStore.deleteByUserId(userId);
		}
	}

	@Test
	@DisplayName("[F-01] 잘못된 소셜 제공자 요청 시 400 ErrorResponse 반환")
	void invalidOAuthProviderReturns400() throws Exception {
		mockMvc.perform(post("/api/v1/auth/oauth/APPLE")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "authorizationCode": "dev:test"
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("INVALID_INPUT"));
	}
}

