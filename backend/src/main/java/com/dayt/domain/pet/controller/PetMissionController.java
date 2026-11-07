package com.dayt.domain.pet.controller;

import java.util.List;

import com.dayt.domain.pet.dto.CouplePetResponse;
import com.dayt.domain.pet.dto.DailyMissionItemResponse;
import com.dayt.domain.pet.service.PetMissionService;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Pets & Missions", description = "Grow Together 커플 펫 성장 및 일일 데이트 미션")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PetMissionController {

	private final PetMissionService petMissionService;

	@Operation(summary = "연결된 커플 펫 성장 상태 조회")
	@GetMapping("/pets/me")
	public ResponseEntity<CouplePetResponse> getMyPet(@AuthenticationPrincipal Jwt jwt) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(petMissionService.getMyPet(userId));
	}

	@Operation(summary = "오늘의 만남 인증 (하루 1회 경험치 성장 반영)")
	@PostMapping("/pets/check-in")
	public ResponseEntity<CouplePetResponse> checkInToday(@AuthenticationPrincipal Jwt jwt) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(petMissionService.checkInToday(userId));
	}

	@Operation(summary = "오늘의 커플 성장 미션 목록 조회")
	@GetMapping("/missions/today")
	public ResponseEntity<List<DailyMissionItemResponse>> getTodayMissions(@AuthenticationPrincipal Jwt jwt) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(petMissionService.getTodayMissions(userId));
	}

	@Operation(summary = "오늘의 성장 미션 완료 처리 및 펫 경험치 적립")
	@PostMapping("/missions/{missionLogId}/complete")
	public ResponseEntity<DailyMissionItemResponse> completeMission(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long missionLogId
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(petMissionService.completeMission(userId, missionLogId));
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

