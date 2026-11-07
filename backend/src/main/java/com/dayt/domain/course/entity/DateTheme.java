package com.dayt.domain.course.entity;

import java.util.Arrays;
import java.util.Locale;

import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DateTheme {

	CAFE("감성 카페"),
	FOOD_TOUR("맛집 투어"),
	ACTIVITY("액티비티"),
	EXHIBITION("전시·문화"),
	WALK_OUTDOOR("산책·야외"),
	ANYWHERE("어디든");

	private final String label;

	@JsonValue
	public String getLabel() {
		return label;
	}

	@JsonCreator
	public static DateTheme fromValue(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String trimmed = raw.trim();
		return Arrays.stream(values())
				.filter(item -> item.label.equals(trimmed)
						|| item.name().equalsIgnoreCase(trimmed.toUpperCase(Locale.ROOT)))
				.findFirst()
				.orElseThrow(() -> new BusinessException(
						ErrorCode.INVALID_INPUT,
						"지원하지 않는 데이트 테마입니다: " + raw
				));
	}
}

