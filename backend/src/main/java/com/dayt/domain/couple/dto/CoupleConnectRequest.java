package com.dayt.domain.couple.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CoupleConnectRequest(
		@NotBlank(message = "초대 코드를 입력해주세요.")
		@Size(max = 20, message = "초대 코드는 20자 이하여야 합니다.")
		String inviteCode,
		LocalDate startedDate
) {
}

