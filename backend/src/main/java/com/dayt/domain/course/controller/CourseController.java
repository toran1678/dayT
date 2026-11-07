package com.dayt.domain.course.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.dayt.domain.course.dto.CourseCollaborationRequest;
import com.dayt.domain.course.dto.CourseDetailResponse;
import com.dayt.domain.course.dto.CourseListItem;
import com.dayt.domain.course.dto.CourseRecommendRequest;
import com.dayt.domain.course.dto.CourseRecommendationPreviewResponse;
import com.dayt.domain.course.dto.CourseUpsertRequest;
import com.dayt.domain.course.dto.GoogleMapsLinkResponse;
import com.dayt.domain.course.service.CourseService;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Courses", description = "데이트 코스 메이커 · AI 추천 · 보관함 · 공유 동선 조회")
@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

	private static final MediaType KML_MEDIA_TYPE =
			MediaType.parseMediaType("application/vnd.google-earth.kml+xml;charset=UTF-8");

	private final CourseService courseService;

	@Operation(summary = "내 저장 코스(및 커플 공유 코스) 목록 조회")
	@GetMapping
	public ResponseEntity<List<CourseListItem>> getMyCourses(@AuthenticationPrincipal Jwt jwt) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(courseService.getMyCourses(userId));
	}

	@Operation(summary = "새 데이트 코스 저장 (직접 제작 또는 AI 추천본 확정 저장)")
	@PostMapping
	public ResponseEntity<CourseDetailResponse> createCourse(
			@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody CourseUpsertRequest request
	) {
		Long userId = extractUserId(jwt);
		CourseDetailResponse created = courseService.createCourse(userId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	@Operation(summary = "Gemini 기반 맞춤형 데이트 코스 자동 추천 생성")
	@PostMapping("/recommend")
	public ResponseEntity<CourseRecommendationPreviewResponse> recommendCourse(
			@AuthenticationPrincipal Jwt jwt,
			@Valid @RequestBody CourseRecommendRequest request
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(courseService.recommendCourse(userId, request));
	}

	@Operation(summary = "공유 토큰으로 코스 상세 조회")
	@GetMapping("/shared/{shareToken}")
	public ResponseEntity<CourseDetailResponse> getSharedCourse(@PathVariable String shareToken) {
		return ResponseEntity.ok(courseService.getSharedCourse(shareToken));
	}

	@Operation(summary = "데이트 코스 상세 조회 (지도 마커·폴리라인 동선 데이터 포함)")
	@GetMapping("/{courseId}")
	public ResponseEntity<CourseDetailResponse> getCourseDetail(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long courseId
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(courseService.getCourseDetail(userId, courseId));
	}

	@Operation(summary = "스마트폰 구글맵 원클릭 경유지 길안내 Deep Link 생성")
	@GetMapping("/{courseId}/google-maps-link")
	public ResponseEntity<GoogleMapsLinkResponse> getGoogleMapsLink(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long courseId
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(courseService.getGoogleMapsLink(userId, courseId));
	}

	@Operation(summary = "구글 내 지도(My Maps) 임포트용 KML 파일 다운로드")
	@GetMapping(value = "/{courseId}/export.kml", produces = "application/vnd.google-earth.kml+xml")
	public ResponseEntity<byte[]> exportCourseKml(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long courseId
	) {
		Long userId = extractUserId(jwt);
		byte[] kmlBytes = courseService.exportCourseKml(userId, courseId);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(KML_MEDIA_TYPE);
		headers.setContentDisposition(
				ContentDisposition.attachment()
						.filename("dayt-course-" + courseId + ".kml", StandardCharsets.UTF_8)
						.build()
		);
		return new ResponseEntity<>(kmlBytes, headers, HttpStatus.OK);
	}

	@Operation(summary = "실시간 공동 코스 편집 허용 여부 변경")
	@PatchMapping("/{courseId}/collaboration")
	public ResponseEntity<CourseDetailResponse> updateCollaboration(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long courseId,
			@Valid @RequestBody CourseCollaborationRequest request
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(
				courseService.updateCollaboration(userId, courseId, Boolean.TRUE.equals(request.isCollabOpen()))
		);
	}

	@Operation(summary = "데이트 코스 전체 수정 (제목, 테마, 방문 장소 및 순서 변경)")
	@PutMapping("/{courseId}")
	public ResponseEntity<CourseDetailResponse> updateCourse(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long courseId,
			@Valid @RequestBody CourseUpsertRequest request
	) {
		Long userId = extractUserId(jwt);
		return ResponseEntity.ok(courseService.updateCourse(userId, courseId, request));
	}

	@Operation(summary = "데이트 코스 삭제")
	@DeleteMapping("/{courseId}")
	public ResponseEntity<Void> deleteCourse(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable Long courseId
	) {
		Long userId = extractUserId(jwt);
		courseService.deleteCourse(userId, courseId);
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
