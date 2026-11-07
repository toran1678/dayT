package com.dayt.domain.course.dto;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import com.dayt.domain.course.entity.Course;
import com.dayt.domain.course.entity.CoursePlace;
import com.dayt.domain.course.entity.CourseSourceType;
import com.dayt.domain.course.entity.DateTheme;
import com.dayt.domain.course.entity.DateTimeSlot;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CourseDetailResponse(
		Long id,
		Long creatorId,
		Long coupleId,
		String title,
		String description,
		List<DateTheme> themeTags,
		DateTimeSlot timeSlot,
		Integer totalEstimatedCost,
		Integer totalDurationMinutes,
		CourseSourceType sourceType,
		String shareToken,
		Boolean isCollabOpen,
		List<CoursePlaceDetailItem> places,
		List<LatLngPoint> routePolyline,
		Instant createdAt,
		Instant updatedAt
) {
	public static CourseDetailResponse from(Course course) {
		List<CoursePlace> sortedPlaces = course.getCoursePlaces().stream()
				.sorted(Comparator.comparingInt(CoursePlace::getVisitOrder))
				.toList();

		List<CoursePlaceDetailItem> placeItems = sortedPlaces.stream()
				.map(CoursePlaceDetailItem::from)
				.toList();

		List<LatLngPoint> polyline = sortedPlaces.stream()
				.map(cp -> new LatLngPoint(
						cp.getPlace().getLatitude(),
						cp.getPlace().getLongitude()
				))
				.toList();

		List<DateTheme> themes = course.getThemeTags().stream()
				.map(raw -> {
					try {
						return DateTheme.fromValue(raw);
					}
					catch (RuntimeException ex) {
						return null;
					}
				})
				.filter(Objects::nonNull)
				.toList();

		return new CourseDetailResponse(
				course.getId(),
				course.getCreatorId(),
				course.getCoupleId(),
				course.getTitle(),
				course.getDescription(),
				themes,
				course.getTimeSlot(),
				course.getTotalEstimatedCost(),
				course.getTotalDurationMinutes(),
				course.getSourceType(),
				course.getShareToken(),
				course.getIsCollabOpen(),
				placeItems,
				polyline,
				course.getCreatedAt(),
				course.getUpdatedAt()
		);
	}
}

