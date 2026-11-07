package com.dayt.domain.couple.controller;

import com.dayt.domain.couple.dto.CoupleConnectRequest;
import com.dayt.domain.couple.dto.CoupleInviteResponse;
import com.dayt.domain.couple.dto.CoupleSummaryResponse;
import com.dayt.domain.couple.service.CoupleService;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Users & Couples", description = "커플 초대 코드 발급 및 연결")
@RestController
@RequestMapping("/api/v1/couples")
@RequiredArgsConstructor
public class CoupleController {

	private final CoupleService coupleService;

	@Operation(summary = "커플 연결용 초대 코드 생성")
	@PostMapping("/invite")
	public ResponseEntity<CoupleInviteResponse> createInvite(@AuthenticationPrincipal Jwt jwt) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(coupleService.createOrGetInvite(userId));
	}

	@Operation(summary = "초대 코드로 커플 연결 확정")
	@PostMapping("/connect")
	public ResponseEntity<CoupleSummaryResponse> connectCouple(
			@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody CoupleConnectRequest request
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(coupleService.connectCouple(userId, request));
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

