package com.dayt.domain.auth.oauth;

import com.dayt.domain.user.entity.OAuthProvider;

public interface OAuthUserInfoClient {

	OAuthUserProfile fetchUserProfile(OAuthProvider provider, String authorizationCode, String redirectUri);
}

