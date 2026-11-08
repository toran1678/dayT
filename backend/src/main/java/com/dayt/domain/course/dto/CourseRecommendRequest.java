package com.dayt.domain.course.dto;

import java.time.LocalDate;
import java.util.List;

import com.dayt.domain.course.entity.DateTheme;
import com.dayt.domain.course.entity.DateTimeSlot;
import com.dayt.domain.place.entity.FoodCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CourseRecommendRequest(
		@NotBlank(message = "추천 희망 지역(regionKeyword)은 필수입니다.")
		String regionKeyword,

		Double latitude,

		Double longitude,

		Double radiusKm,

		LocalDate targetDate,

		@NotEmpty(message = "최소 1개 이상의 데이트 테마(themeTags)를 선택해주세요.")
		List<DateTheme> themeTags,

		List<FoodCategory> foodCategories,

		@NotNull(message = "1인 예산(budgetPerPerson)은 필수입니다.")
		@Min(value = 0, message = "1인 예산은 0원 이상이어야 합니다.")
		Integer budgetPerPerson,

		@NotNull(message = "데이트 시간대(timeSlot)는 필수입니다.")
		DateTimeSlot timeSlot,

		List<String> moodKeywords
) {
	public CourseRecommendRequest(
			String regionKeyword,
			Double latitude,
			Double longitude,
			List<DateTheme> themeTags,
			List<FoodCategory> foodCategories,
			Integer budgetPerPerson,
			DateTimeSlot timeSlot,
			List<String> moodKeywords
	) {
		this(regionKeyword, latitude, longitude, null, null, themeTags, foodCategories, budgetPerPerson, timeSlot, moodKeywords);
	}
}

