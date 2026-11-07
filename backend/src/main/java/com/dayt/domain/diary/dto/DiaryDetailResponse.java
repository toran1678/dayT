package com.dayt.domain.diary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.dayt.domain.diary.entity.Diary;
import com.dayt.domain.diary.entity.DiaryImage;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record DiaryDetailResponse(
		Long id,
		Long authorId,
		Long coupleId,
		Long courseId,
		LocalDate dateAt,
		String title,
		String content,
		List<String> imageUrls,
		Instant createdAt,
		Instant updatedAt
) {
	public static DiaryDetailResponse from(Diary diary) {
		List<String> urls = diary.getImages().stream()
				.map(DiaryImage::getImageUrl)
				.toList();

		return new DiaryDetailResponse(
				diary.getId(),
				diary.getAuthorId(),
				diary.getCoupleId(),
				diary.getCourseId(),
				diary.getDateAt(),
				diary.getTitle(),
				diary.getContent(),
				urls,
				diary.getCreatedAt(),
				diary.getUpdatedAt()
		);
	}
}

