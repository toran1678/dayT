package com.dayt.domain.course.collab;

import java.time.Instant;

import com.dayt.domain.course.dto.CourseDetailResponse;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CollabBroadcastEvent(
		String action,
		Long courseId,
		Long editorUserId,
		String editorNickname,
		String clientSessionId,
		CourseDetailResponse course,
		Instant timestamp
) {
}

