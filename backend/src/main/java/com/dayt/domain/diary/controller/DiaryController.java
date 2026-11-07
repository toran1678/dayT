package com.dayt.domain.diary.controller;

import java.util.List;

import com.dayt.domain.diary.dto.DiaryDetailResponse;
import com.dayt.domain.diary.dto.DiaryUpsertRequest;
import com.dayt.domain.diary.service.DiaryService;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Diaries", description = "커플 데이트 일기장 조회 · 작성 · 수정 · 삭제")
@RestController
@RequestMapping("/api/v1/diaries")
@RequiredArgsConstructor
public class DiaryController {

	private final DiaryService diaryService;

	@Operation(summary = "데이트 일기 목록 조회")
	@GetMapping
	public ResponseEntity<List<DiaryDetailResponse>> getDiaries(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(diaryService.getDiaries(userId, page, size));
	}

	@Operation(summary = "데이트 일기 작성")
	@PostMapping
	public ResponseEntity<DiaryDetailResponse> createDiary(
			@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody DiaryUpsertRequest request
	) {
		Long userId = extractUserId(jwt);
		DiaryDetailResponse created = diaryService.createDiary(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@Operation(summary = "데이트 일기 상세 조회")
	@GetMapping("/{diaryId}")
	public ResponseEntity<DiaryDetailResponse> getDiaryDetail(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long diaryId
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(diaryService.getDiaryDetail(userId, diaryId));
	}

	@Operation(summary = "데이트 일기 수정")
	@PutMapping("/{diaryId}")
	public ResponseEntity<DiaryDetailResponse> updateDiary(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long diaryId,
			@Valid @RequestBody DiaryUpsertRequest request
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(diaryService.updateDiary(userId, diaryId, request));
	}

	@Operation(summary = "데이트 일기 삭제")
	@DeleteMapping("/{diaryId}")
	public ResponseEntity<Void> deleteDiary(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long diaryId
	) {
		Long userId = extractUserId(jwt);
		diaryService.deleteDiary(userId, diaryId);
		return ResponseEntity.noContent().build();
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

