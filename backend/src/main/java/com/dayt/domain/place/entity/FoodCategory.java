package com.dayt.domain.place.entity;

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
public enum FoodCategory {

	KOREAN("한식", "솥밥 & 정갈한 모던 한식"),
	CHINESE("중식", "육즙 수제 딤섬 & 우육면"),
	JAPANESE("일식", "바삭한 텐동 & 숙성 등심카츠"),
	WESTERN("양식", "트러플 감자뇨끼 & 생면 파스타"),
	CHICKEN("치킨", "오븐 로스트 치킨 & 크래프트 비어"),
	MEAT("고기", "그릴링 숙성 삼겹살 & 꽃목살"),
	SNACK("분식", "차돌 즉석떡볶이 & 프리미엄 김밥"),
	ETC("기타", "이색 퓨전 다이닝");

	private final String label;
	private final String signatureSubMenu;

	@JsonValue
	public String getLabel() {
		return label;
	}

	@JsonCreator
	public static FoodCategory fromValue(String raw) {
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
						"지원하지 않는 음식 카테고리입니다: " + raw
				));
	}
}

