package com.dayt.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record TokenRefreshRequest(
		@NotBlank(message = "리프레시 토큰(refreshToken)은 필수입니다.")
		String refreshToken
) {
}

