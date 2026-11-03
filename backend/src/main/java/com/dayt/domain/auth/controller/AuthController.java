package com.dayt.domain.auth.controller;

import com.dayt.domain.auth.dto.AuthTokenResponse;
import com.dayt.domain.auth.dto.OAuthLoginRequest;
import com.dayt.domain.auth.dto.TokenRefreshRequest;
import com.dayt.domain.auth.service.AuthService;
import com.dayt.domain.user.entity.OAuthProvider;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth", description = "소셜 로그인 및 토큰 인증")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@Operation(summary = "소셜 로그인 (카카오 / 구글)")
	@PostMapping("/oauth/{provider}")
	public ResponseEntity<AuthTokenResponse> loginWithOAuth(
			@PathVariable("provider") String rawProvider,
			@Valid @RequestBody OAuthLoginRequest request
	) {
		OAuthProvider provider = OAuthProvider.fromPath(rawProvider);
		return ResponseEntity.ok(authService.loginWithOAuth(provider, request));
	}

	@Operation(summary = "Access Token 재발급")
	@PostMapping("/refresh")
	public ResponseEntity<AuthTokenResponse> refresh(@Valid @RequestBody TokenRefreshRequest request) {
		return ResponseEntity.ok(authService.refreshTokens(request));
	}

	@Operation(summary = "로그아웃 (Refresh Token 만료 처리)")
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@AuthenticationPrincipal Jwt jwt) {
		if (jwt == null || jwt.getSubject() == null) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED);
		}
		authService.logout(Long.parseLong(jwt.getSubject()));
		return ResponseEntity.noContent().build();
	}
}

