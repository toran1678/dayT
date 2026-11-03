package com.dayt.domain.auth.dto;

import com.dayt.domain.user.dto.UserSummaryResponse;

public record AuthTokenResponse(
		String accessToken,
		String refreshToken,
		UserSummaryResponse user
) {
}

