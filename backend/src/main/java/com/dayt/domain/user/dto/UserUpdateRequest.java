package com.dayt.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
		@NotBlank(message = "닉네임은 비어 있을 수 없습니다.")
		@Size(max = 50, message = "닉네임은 최대 50자까지 입력할 수 있습니다.")
		String nickname,

		String profileImageUrl
) {
}

