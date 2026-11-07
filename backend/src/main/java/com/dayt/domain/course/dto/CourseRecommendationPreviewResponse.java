package com.dayt.domain.course.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CourseRecommendationPreviewResponse(
		String suggestedTitle,
		String aiReason,
		Integer totalEstimatedCost,
		Integer totalDurationMinutes,
		List<CoursePlaceDetailItem> places,
		List<LatLngPoint> routePolyline
) {
}

