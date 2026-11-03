package com.dayt.domain.user.dto;

import com.dayt.domain.user.entity.OAuthProvider;
import com.dayt.domain.user.entity.User;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record UserSummaryResponse(
		Long id,
		String email,
		String nickname,
		String profileImageUrl,
		OAuthProvider oauthProvider,
		Long coupleId
) {
	public static UserSummaryResponse from(User user) {
		return new UserSummaryResponse(
				user.getId(),
				user.getEmail(),
				user.getNickname(),
				user.getProfileImageUrl(),
				user.getOauthProvider(),
				user.getCoupleId()
		);
	}
}

