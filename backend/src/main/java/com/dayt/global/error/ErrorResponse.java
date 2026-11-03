package com.dayt.global.error;

import java.time.Instant;

/**
 * Matches {@code components.schemas.ErrorResponse} in {@code docs/api-spec.yaml} 1:1.
 */
public record ErrorResponse(
		String code,
		String message,
		Instant timestamp
) {

	public static ErrorResponse of(ErrorCode errorCode) {
		return new ErrorResponse(errorCode.getCode(), errorCode.getMessage(), Instant.now());
	}

	public static ErrorResponse of(ErrorCode errorCode, String customMessage) {
		return new ErrorResponse(errorCode.getCode(), customMessage, Instant.now());
	}
}

