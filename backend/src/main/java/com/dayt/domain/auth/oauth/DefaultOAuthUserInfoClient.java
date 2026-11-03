package com.dayt.domain.auth.oauth;

import java.util.Locale;
import java.util.Map;

import com.dayt.domain.user.entity.OAuthProvider;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class DefaultOAuthUserInfoClient implements OAuthUserInfoClient {

	private static final String DEV_CODE_PREFIX = "dev:";
	private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
			new ParameterizedTypeReference<>() {};

	private final RestClient restClient;
	private final boolean devMockEnabled;
	private final String kakaoClientId;
	private final String kakaoClientSecret;
	private final String googleClientId;
	private final String googleClientSecret;

	public DefaultOAuthUserInfoClient(
			@Value("${dayt.oauth.dev-mock-enabled:false}") boolean devMockEnabled,
			@Value("${dayt.oauth.kakao.client-id:}") String kakaoClientId,
			@Value("${dayt.oauth.kakao.client-secret:}") String kakaoClientSecret,
			@Value("${dayt.oauth.google.client-id:}") String googleClientId,
			@Value("${dayt.oauth.google.client-secret:}") String googleClientSecret
	) {
		this.restClient = RestClient.create();
		this.devMockEnabled = devMockEnabled;
		this.kakaoClientId = kakaoClientId;
		this.kakaoClientSecret = kakaoClientSecret;
		this.googleClientId = googleClientId;
		this.googleClientSecret = googleClientSecret;
	}

	@Override
	public OAuthUserProfile fetchUserProfile(OAuthProvider provider, String authorizationCode, String redirectUri) {
		if (devMockEnabled && authorizationCode.startsWith(DEV_CODE_PREFIX)) {
			return buildDevMockProfile(provider, authorizationCode.substring(DEV_CODE_PREFIX.length()).trim());
		}

		return switch (provider) {
			case KAKAO -> fetchKakaoProfile(authorizationCode, redirectUri);
			case GOOGLE -> fetchGoogleProfile(authorizationCode, redirectUri);
		};
	}

	private OAuthUserProfile buildDevMockProfile(OAuthProvider provider, String rawSeed) {
		if (rawSeed.isBlank()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "개발용 인가 코드 식별자가 비어 있습니다.");
		}
		String safeSeed = rawSeed.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_.-]", "_");
		String providerLower = provider.name().toLowerCase(Locale.ROOT);
		String oauthId = "dev_" + providerLower + "_" + safeSeed;
		String email = providerLower + "." + safeSeed + "@dayt.local";
		String label = (provider == OAuthProvider.KAKAO) ? "카카오 데이터" : "구글 데이터";
		String nickname = "dayt".equals(safeSeed) ? label : label + " (" + safeSeed + ")";

		return new OAuthUserProfile(provider, oauthId, email, nickname, null);
	}

	private OAuthUserProfile fetchKakaoProfile(String codeOrToken, String redirectUri) {
		String accessToken = (redirectUri != null && !redirectUri.isBlank())
				? exchangeKakaoCode(codeOrToken, redirectUri)
				: codeOrToken;

		try {
			Map<String, Object> body = restClient.get()
					.uri("https://kapi.kakao.com/v2/user/me")
					.header("Authorization", "Bearer " + accessToken)
					.retrieve()
					.body(MAP_TYPE);

			if (body == null || body.get("id") == null) {
				throw new BusinessException(ErrorCode.UNAUTHORIZED, "카카오 사용자 정보를 확인할 수 없습니다.");
			}

			String oauthId = String.valueOf(body.get("id"));
			String email = null;
			String nickname = "DayT 사용자";
			String profileImageUrl = null;

			Object accountObj = body.get("kakao_account");
			if (accountObj instanceof Map<?, ?> account) {
				if (account.get("email") instanceof String accountEmail && !accountEmail.isBlank()) {
					email = accountEmail;
				}
				Object profileObj = account.get("profile");
				if (profileObj instanceof Map<?, ?> profile) {
					if (profile.get("nickname") instanceof String name && !name.isBlank()) {
						nickname = name;
					}
					if (profile.get("profile_image_url") instanceof String img && !img.isBlank()) {
						profileImageUrl = img;
					}
				}
			}

			return new OAuthUserProfile(OAuthProvider.KAKAO, oauthId, email, nickname, profileImageUrl);
		}
		catch (RestClientException ex) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "카카오 인증 토큰 검증에 실패했습니다.");
		}
	}

	private String exchangeKakaoCode(String authorizationCode, String redirectUri) {
		ensureClientConfigured(kakaoClientId, "KAKAO_CLIENT_ID");

		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("grant_type", "authorization_code");
		form.add("client_id", kakaoClientId);
		form.add("redirect_uri", redirectUri);
		form.add("code", authorizationCode);
		if (kakaoClientSecret != null && !kakaoClientSecret.isBlank()
				&& !kakaoClientSecret.startsWith("your_")) {
			form.add("client_secret", kakaoClientSecret);
		}

		return requestAccessToken("https://kauth.kakao.com/oauth/token", form, "카카오");
	}

	private OAuthUserProfile fetchGoogleProfile(String codeOrToken, String redirectUri) {
		String accessToken = (redirectUri != null && !redirectUri.isBlank())
				? exchangeGoogleCode(codeOrToken, redirectUri)
				: codeOrToken;

		try {
			Map<String, Object> body = restClient.get()
					.uri("https://www.googleapis.com/oauth2/v3/userinfo")
					.header("Authorization", "Bearer " + accessToken)
					.retrieve()
					.body(MAP_TYPE);

			if (body == null || body.get("sub") == null) {
				throw new BusinessException(ErrorCode.UNAUTHORIZED, "구글 사용자 정보를 확인할 수 없습니다.");
			}

			String oauthId = String.valueOf(body.get("sub"));
			String email = (body.get("email") instanceof String e && !e.isBlank()) ? e : null;
			String nickname = (body.get("name") instanceof String n && !n.isBlank()) ? n : "DayT 사용자";
			String profileImageUrl = (body.get("picture") instanceof String p && !p.isBlank()) ? p : null;

			return new OAuthUserProfile(OAuthProvider.GOOGLE, oauthId, email, nickname, profileImageUrl);
		}
		catch (RestClientException ex) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "구글 인증 토큰 검증에 실패했습니다.");
		}
	}

	private String exchangeGoogleCode(String authorizationCode, String redirectUri) {
		ensureClientConfigured(googleClientId, "GOOGLE_CLIENT_ID");
		ensureClientConfigured(googleClientSecret, "GOOGLE_CLIENT_SECRET");

		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("grant_type", "authorization_code");
		form.add("client_id", googleClientId);
		form.add("client_secret", googleClientSecret);
		form.add("redirect_uri", redirectUri);
		form.add("code", authorizationCode);

		return requestAccessToken("https://oauth2.googleapis.com/token", form, "구글");
	}

	private String requestAccessToken(String tokenUri, MultiValueMap<String, String> form, String providerLabel) {
		try {
			Map<String, Object> tokenBody = restClient.post()
					.uri(tokenUri)
					.contentType(MediaType.APPLICATION_FORM_URLENCODED)
					.body(form)
					.retrieve()
					.body(MAP_TYPE);

			if (tokenBody != null && tokenBody.get("access_token") instanceof String accessToken
					&& !accessToken.isBlank()) {
				return accessToken;
			}
			throw new BusinessException(ErrorCode.UNAUTHORIZED, providerLabel + " 인가 코드 교환 결과가 비어 있습니다.");
		}
		catch (RestClientException ex) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED, providerLabel + " 인가 코드가 유효하지 않거나 만료되었습니다.");
		}
	}

	private static void ensureClientConfigured(String value, String envName) {
		if (value == null || value.isBlank() || value.startsWith("your_")) {
			throw new BusinessException(
					ErrorCode.INVALID_INPUT,
					envName + " 환경변수가 설정되지 않았습니다. (.env 설정을 확인해주세요.)"
			);
		}
	}
}

