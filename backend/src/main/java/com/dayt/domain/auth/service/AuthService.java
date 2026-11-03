package com.dayt.domain.auth.service;

import com.dayt.domain.auth.dto.AuthTokenResponse;
import com.dayt.domain.auth.dto.OAuthLoginRequest;
import com.dayt.domain.auth.dto.TokenRefreshRequest;
import com.dayt.domain.auth.oauth.OAuthUserInfoClient;
import com.dayt.domain.auth.oauth.OAuthUserProfile;
import com.dayt.domain.auth.token.JwtTokenProvider;
import com.dayt.domain.auth.token.RefreshTokenStore;
import com.dayt.domain.user.dto.UserSummaryResponse;
import com.dayt.domain.user.entity.OAuthProvider;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

	private static final int MAX_NICKNAME_LENGTH = 50;

	private final UserRepository userRepository;
	private final OAuthUserInfoClient oauthUserInfoClient;
	private final JwtTokenProvider jwtTokenProvider;
	private final RefreshTokenStore refreshTokenStore;

	@Transactional
	public AuthTokenResponse loginWithOAuth(OAuthProvider provider, OAuthLoginRequest request) {
		OAuthUserProfile profile = oauthUserInfoClient.fetchUserProfile(
				provider,
				request.authorizationCode().trim(),
				request.redirectUri()
		);

		User user = userRepository
				.findByOauthProviderAndOauthId(provider, profile.oauthId())
				.orElseGet(() -> registerNewUser(profile));

		return issueAndPersistTokens(user);
	}

	@Transactional(readOnly = true)
	public AuthTokenResponse refreshTokens(TokenRefreshRequest request) {
		String incomingRefresh = request.refreshToken().trim();
		Long userId = jwtTokenProvider.parseAndValidateRefreshToken(incomingRefresh);

		String storedRefresh = refreshTokenStore.findByUserId(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "만료되었거나 로그아웃된 세션입니다."));

		if (!storedRefresh.equals(incomingRefresh)) {
			refreshTokenStore.deleteByUserId(userId);
			throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다.");
		}

		User user = userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "사용자 정보를 찾을 수 없습니다."));

		return issueAndPersistTokens(user);
	}

	public void logout(Long userId) {
		refreshTokenStore.deleteByUserId(userId);
	}

	private AuthTokenResponse issueAndPersistTokens(User user) {
		String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getOauthProvider());
		String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
		refreshTokenStore.save(user.getId(), refreshToken, jwtTokenProvider.getRefreshTokenTtl());

		return new AuthTokenResponse(
				accessToken,
				refreshToken,
				UserSummaryResponse.from(user)
		);
	}

	private User registerNewUser(OAuthUserProfile profile) {
		String safeEmail = profile.email();
		if (safeEmail != null && userRepository.existsByEmail(safeEmail)) {
			safeEmail = null;
		}

		String rawNickname = (profile.nickname() == null || profile.nickname().isBlank())
				? "DayT 사용자"
				: profile.nickname().trim();
		String safeNickname = rawNickname.length() > MAX_NICKNAME_LENGTH
				? rawNickname.substring(0, MAX_NICKNAME_LENGTH)
				: rawNickname;

		User newUser = User.builder()
				.oauthProvider(profile.provider())
				.oauthId(profile.oauthId())
				.email(safeEmail)
				.nickname(safeNickname)
				.profileImageUrl(profile.profileImageUrl())
				.build();

		return userRepository.save(newUser);
	}
}

