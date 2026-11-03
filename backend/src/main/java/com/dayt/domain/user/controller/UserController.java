package com.dayt.domain.user.controller;

import com.dayt.domain.user.dto.UserSummaryResponse;
import com.dayt.domain.user.dto.UserUpdateRequest;
import com.dayt.domain.user.service.UserService;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Users & Couples", description = "내 프로필 및 커플 연결 관리")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

	private final UserService userService;

	@Operation(summary = "내 프로필 및 커플 상태 조회")
	@GetMapping("/me")
	public ResponseEntity<UserSummaryResponse> getMyProfile(@AuthenticationPrincipal Jwt jwt) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(userService.getMyProfile(userId));
	}

	@Operation(summary = "내 프로필 수정")
	@PatchMapping("/me")
	public ResponseEntity<UserSummaryResponse> updateMyProfile(
			@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody UserUpdateRequest request
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(userService.updateMyProfile(userId, request));
	}

	private static Long extractUserId(Jwt jwt) {
		if (jwt == null || jwt.getSubject() == null) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED);
		}
		try {
			return Long.parseLong(jwt.getSubject());
		}
		catch (NumberFormatException ex) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED);
		}
	}
}

