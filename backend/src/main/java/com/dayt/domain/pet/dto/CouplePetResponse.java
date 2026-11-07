package com.dayt.domain.pet.dto;

import java.time.LocalDate;

import com.dayt.domain.pet.entity.CouplePet;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CouplePetResponse(
		Long id,
		Long coupleId,
		String name,
		String characterType,
		Integer level,
		Integer exp,
		Integer nextLevelExp,
		LocalDate lastMetDate,
		Integer totalMeetDays
) {
	public static CouplePetResponse from(CouplePet pet) {
		return new CouplePetResponse(
				pet.getId(),
				pet.getCoupleId(),
				pet.getName(),
				pet.getCharacterType(),
				pet.getLevel(),
				pet.getExp(),
				pet.getNextLevelExp(),
				pet.getLastMetDate(),
				pet.getTotalMeetDays()
		);
	}
}

