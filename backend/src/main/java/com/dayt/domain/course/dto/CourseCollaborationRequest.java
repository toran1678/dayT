package com.dayt.domain.course.dto;

import jakarta.validation.constraints.NotNull;

public record CourseCollaborationRequest(
		@NotNull(message = "isCollabOpen 값이 필요합니다.")
		Boolean isCollabOpen
) {
}

