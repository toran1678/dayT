package com.dayt.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthLoginRequest(
		@NotBlank(message = "인가 코드(authorizationCode)는 필수입니다.")
		String authorizationCode,

		String redirectUri
) {
}

