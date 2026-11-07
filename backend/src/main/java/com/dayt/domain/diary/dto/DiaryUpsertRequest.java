package com.dayt.domain.diary.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DiaryUpsertRequest(
		@NotNull(message = "데이트 날짜를 선택해주세요.")
		LocalDate dateAt,

		@NotBlank(message = "일기 제목을 입력해주세요.")
		@Size(max = 100, message = "일기 제목은 100자 이하여야 합니다.")
		String title,

		@NotBlank(message = "일기 내용을 입력해주세요.")
		String content,

		Long courseId,

		@NotNull(message = "이미지 목록 필드가 필요합니다.")
		List<String> imageUrls
) {
}

