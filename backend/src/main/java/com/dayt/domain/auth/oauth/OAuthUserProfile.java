package com.dayt.domain.auth.oauth;

import com.dayt.domain.user.entity.OAuthProvider;

public record OAuthUserProfile(
		OAuthProvider provider,
		String oauthId,
		String email,
		String nickname,
		String profileImageUrl
) {
}

