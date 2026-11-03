package com.dayt.domain.user.entity;

import java.util.Locale;

import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;

public enum OAuthProvider {
	KAKAO,
	GOOGLE;

	public static OAuthProvider fromPath(String rawValue) {
		if (rawValue == null || rawValue.isBlank()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "지원하지 않는 소셜 로그인 제공자입니다.");
		}
		try {
			return OAuthProvider.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
		}
		catch (IllegalArgumentException ex) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "지원하지 않는 소셜 로그인 제공자입니다: " + rawValue);
		}
	}
}

