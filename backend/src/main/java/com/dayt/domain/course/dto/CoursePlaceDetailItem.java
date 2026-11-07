package com.dayt.domain.course.dto;

import com.dayt.domain.course.entity.CoursePlace;
import com.dayt.domain.place.dto.PlaceDetailResponse;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CoursePlaceDetailItem(
		Integer visitOrder,
		Integer estimatedCost,
		Integer stayMinutes,
		Integer travelMinutesToNext,
		String memo,
		PlaceDetailResponse place
) {
	public static CoursePlaceDetailItem from(CoursePlace coursePlace) {
		return new CoursePlaceDetailItem(
				coursePlace.getVisitOrder(),
				coursePlace.getEstimatedCost(),
				coursePlace.getStayMinutes(),
				coursePlace.getTravelMinutesToNext(),
				coursePlace.getMemo(),
				PlaceDetailResponse.from(coursePlace.getPlace())
		);
	}
}

