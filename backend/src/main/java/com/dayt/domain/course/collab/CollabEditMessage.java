package com.dayt.domain.course.collab;

import com.dayt.domain.course.dto.CourseUpsertRequest;

public record CollabEditMessage(
		String action,
		String clientSessionId,
		CourseUpsertRequest course
) {
}

