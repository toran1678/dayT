package com.dayt.domain.couple.dto;

import java.time.LocalDate;

import com.dayt.domain.couple.entity.Couple;
import com.dayt.domain.couple.entity.CoupleStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CoupleSummaryResponse(
		Long id,
		CoupleStatus status,
		LocalDate startedDate,
		String partnerNickname
) {
	public static CoupleSummaryResponse of(Couple couple, String partnerNickname) {
		return new CoupleSummaryResponse(
				couple.getId(),
				couple.getStatus(),
				couple.getStartedDate(),
				partnerNickname
		);
	}
}

