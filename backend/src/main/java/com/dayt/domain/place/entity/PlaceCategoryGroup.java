package com.dayt.domain.place.entity;

import java.util.Locale;

import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;

public enum PlaceCategoryGroup {
	RESTAURANT,
	CAFE,
	ACTIVITY,
	EXHIBITION,
	PARK,
	ETC;

	public static PlaceCategoryGroup fromParam(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			return PlaceCategoryGroup.valueOf(raw.trim().toUpperCase(Locale.ROOT));
		}
		catch (IllegalArgumentException ex) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "유효하지 않은 장소 카테고리입니다: " + raw);
		}
	}
}

