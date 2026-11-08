package com.dayt.domain.course.dto;

import java.time.LocalDate;
import java.util.List;

import com.dayt.domain.course.entity.CourseSourceType;
import com.dayt.domain.course.entity.DateTheme;
import com.dayt.domain.course.entity.DateTimeSlot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CourseUpsertRequest(
		@NotBlank(message = "코스 제목을 입력해주세요.")
		@Size(max = 100, message = "코스 제목은 100자 이내로 입력해주세요.")
		String title,

		String description,

		@NotNull(message = "테마 태그 목록은 필수입니다.")
		List<DateTheme> themeTags,

		DateTimeSlot timeSlot,

		LocalDate datePlanDate,

		@NotNull(message = "코스 생성 출처(sourceType)는 필수입니다.")
		CourseSourceType sourceType,

		Boolean shareWithCouple,

		@NotEmpty(message = "최소 1개 이상의 장소를 코스에 담아주세요.")
		@Valid
		List<CoursePlaceRequestItem> places
) {
}

