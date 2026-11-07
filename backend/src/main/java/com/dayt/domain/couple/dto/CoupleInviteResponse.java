package com.dayt.domain.couple.dto;

import com.dayt.domain.couple.entity.Couple;
import com.dayt.domain.couple.entity.CoupleStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CoupleInviteResponse(
		Long coupleId,
		String inviteCode,
		CoupleStatus status
) {
	public static CoupleInviteResponse from(Couple couple) {
		return new CoupleInviteResponse(
				couple.getId(),
				couple.getInviteCode(),
				couple.getStatus()
		);
	}
}

