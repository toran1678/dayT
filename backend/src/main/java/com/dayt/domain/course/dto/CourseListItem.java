package com.dayt.domain.course.dto;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import com.dayt.domain.course.entity.Course;
import com.dayt.domain.course.entity.CoursePlace;
import com.dayt.domain.course.entity.DateTheme;
import com.dayt.domain.course.entity.DateTimeSlot;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CourseListItem(
		Long id,
		String title,
		List<DateTheme> themeTags,
		DateTimeSlot timeSlot,
		Integer totalEstimatedCost,
		Integer totalDurationMinutes,
		Integer placeCount,
		String thumbnailUrl,
		Instant createdAt
) {
	public static CourseListItem from(Course course) {
		List<CoursePlace> sortedPlaces = course.getCoursePlaces().stream()
				.sorted(Comparator.comparingInt(CoursePlace::getVisitOrder))
				.toList();

		String firstThumbnail = sortedPlaces.stream()
				.map(cp -> cp.getPlace().getThumbnailUrl())
				.filter(Objects::nonNull)
				.filter(url -> !url.isBlank())
				.findFirst()
				.orElse(null);

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

		return new CourseListItem(
				course.getId(),
				course.getTitle(),
				themes,
				course.getTimeSlot(),
				course.getTotalEstimatedCost(),
				course.getTotalDurationMinutes(),
				sortedPlaces.size(),
				firstThumbnail,
				course.getCreatedAt()
		);
	}
}

