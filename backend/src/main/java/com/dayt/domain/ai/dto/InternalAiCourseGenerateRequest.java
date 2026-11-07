package com.dayt.domain.ai.dto;

import java.util.List;

import com.dayt.domain.course.dto.CourseRecommendRequest;
import com.dayt.domain.place.dto.PlaceDetailResponse;

public record InternalAiCourseGenerateRequest(
		CourseRecommendRequest condition,
		List<PlaceDetailResponse> candidatePlaces
) {
}

