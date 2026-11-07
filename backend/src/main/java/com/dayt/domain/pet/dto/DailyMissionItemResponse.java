package com.dayt.domain.pet.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.dayt.domain.pet.entity.CoupleMissionLog;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record DailyMissionItemResponse(
		Long missionLogId,
		String title,
		String description,
		Integer rewardExp,
		LocalDate assignedDate,
		Boolean isCompleted,
		Instant completedAt
) {
	public static DailyMissionItemResponse from(CoupleMissionLog log) {
		return new DailyMissionItemResponse(
				log.getId(),
				log.getMission().getTitle(),
				log.getMission().getDescription(),
				log.getMission().getRewardExp(),
				log.getAssignedDate(),
				log.getIsCompleted(),
				log.getCompletedAt()
		);
	}
}

