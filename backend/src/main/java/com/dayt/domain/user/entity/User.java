package com.dayt.domain.user.entity;

import com.dayt.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "couple_id")
	private Long coupleId;

	@Column(name = "email", length = 255, unique = true)
	private String email;

	@Column(name = "nickname", length = 50, nullable = false)
	private String nickname;

	@Column(name = "profile_image_url", columnDefinition = "TEXT")
	private String profileImageUrl;

	@Enumerated(EnumType.STRING)
	@Column(name = "oauth_provider", length = 20, nullable = false)
	private OAuthProvider oauthProvider;

	@Column(name = "oauth_id", length = 100, nullable = false)
	private String oauthId;

	@Builder
	private User(
			Long coupleId,
			String email,
			String nickname,
			String profileImageUrl,
			OAuthProvider oauthProvider,
			String oauthId
	) {
		this.coupleId = coupleId;
		this.email = email;
		this.nickname = nickname;
		this.profileImageUrl = profileImageUrl;
		this.oauthProvider = oauthProvider;
		this.oauthId = oauthId;
	}

	public void updateProfile(String nickname, String profileImageUrl) {
		this.nickname = nickname;
		this.profileImageUrl = profileImageUrl;
	}
}

