package com.dayt.domain.diary.service;

import java.util.List;
import java.util.Objects;

import com.dayt.domain.course.repository.CourseRepository;
import com.dayt.domain.diary.dto.DiaryDetailResponse;
import com.dayt.domain.diary.dto.DiaryUpsertRequest;
import com.dayt.domain.diary.entity.Diary;
import com.dayt.domain.diary.repository.DiaryRepository;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DiaryService {

	private final DiaryRepository diaryRepository;
	private final CourseRepository courseRepository;
	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public List<DiaryDetailResponse> getDiaries(Long userId, int page, int size) {
		User user = getRequiredUser(userId);
		int safePage = Math.max(0, page);
		int safeSize = Math.min(50, Math.max(1, size));

		return diaryRepository.findAccessibleDiaries(
						user.getId(),
						user.getCoupleId(),
						PageRequest.of(safePage, safeSize)
				)
				.stream()
				.map(DiaryDetailResponse::from)
				.toList();
	}

	@Transactional
	public DiaryDetailResponse createDiary(Long userId, DiaryUpsertRequest request) {
		User user = getRequiredUser(userId);
		validateLinkedCourse(request.courseId());

		Diary diary = Diary.builder()
				.authorId(user.getId())
				.coupleId(user.getCoupleId())
				.courseId(request.courseId())
				.dateAt(request.dateAt())
				.title(request.title().trim())
				.content(request.content().trim())
				.build();

		diary.replaceImages(request.imageUrls());
		Diary saved = diaryRepository.saveAndFlush(diary);
		return DiaryDetailResponse.from(saved);
	}

	@Transactional(readOnly = true)
	public DiaryDetailResponse getDiaryDetail(Long userId, Long diaryId) {
		User user = getRequiredUser(userId);
		Diary diary = diaryRepository.findWithImagesById(diaryId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "일기를 찾을 수 없습니다."));

		if (!canAccessDiary(diary, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 일기를 조회할 권한이 없습니다.");
		}
		return DiaryDetailResponse.from(diary);
	}

	@Transactional
	public DiaryDetailResponse updateDiary(Long userId, Long diaryId, DiaryUpsertRequest request) {
		User user = getRequiredUser(userId);
		Diary diary = diaryRepository.findWithImagesById(diaryId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "수정할 일기를 찾을 수 없습니다."));

		if (!canAccessDiary(diary, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 일기를 수정할 권한이 없습니다.");
		}
		validateLinkedCourse(request.courseId());

		Long nextCoupleId = user.getCoupleId() != null ? user.getCoupleId() : diary.getCoupleId();
		diary.updateContent(
				nextCoupleId,
				request.courseId(),
				request.dateAt(),
				request.title().trim(),
				request.content().trim()
		);
		diary.getImages().clear();
		diaryRepository.flush();
		diary.replaceImages(request.imageUrls());

		Diary saved = diaryRepository.saveAndFlush(diary);
		return DiaryDetailResponse.from(saved);
	}

	@Transactional
	public void deleteDiary(Long userId, Long diaryId) {
		User user = getRequiredUser(userId);
		Diary diary = diaryRepository.findById(diaryId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "삭제할 일기를 찾을 수 없습니다."));

		if (!canAccessDiary(diary, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 일기를 삭제할 권한이 없습니다.");
		}
		diaryRepository.delete(diary);
	}

	private void validateLinkedCourse(Long courseId) {
		if (courseId != null && !courseRepository.existsById(courseId)) {
			throw new BusinessException(ErrorCode.NOT_FOUND, "연결하려는 코스를 찾을 수 없습니다.");
		}
	}

	private static boolean canAccessDiary(Diary diary, User user) {
		if (Objects.equals(diary.getAuthorId(), user.getId())) {
			return true;
		}
		return diary.getCoupleId() != null && Objects.equals(diary.getCoupleId(), user.getCoupleId());
	}

	private User getRequiredUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
	}
}

