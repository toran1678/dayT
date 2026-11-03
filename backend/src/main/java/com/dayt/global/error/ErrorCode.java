package com.dayt.global.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

	INVALID_INPUT(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "요청 파라미터가 올바르지 않습니다."),
	UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요하거나 유효하지 않은 토큰입니다."),
	FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "요청한 리소스에 대한 접근 권한이 없습니다."),
	NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다."),
	CONFLICT(HttpStatus.CONFLICT, "CONFLICT", "이미 처리되었거나 충돌하는 요청입니다."),
	INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;
}

