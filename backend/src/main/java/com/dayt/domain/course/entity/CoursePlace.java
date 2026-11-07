package com.dayt.domain.course.entity;

import com.dayt.domain.place.entity.Place;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "course_places")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoursePlace {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "course_id", nullable = false)
	private Course course;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "place_id", nullable = false)
	private Place place;

	@Column(name = "visit_order", nullable = false)
	private Integer visitOrder;

	@Column(name = "estimated_cost", nullable = false)
	private Integer estimatedCost;

	@Column(name = "stay_minutes", nullable = false)
	private Integer stayMinutes;

	@Column(name = "travel_minutes_to_next", nullable = false)
	private Integer travelMinutesToNext;

	@Column(name = "memo", length = 255)
	private String memo;

	@Builder
	private CoursePlace(
			Course course,
			Place place,
			Integer visitOrder,
			Integer estimatedCost,
			Integer stayMinutes,
			Integer travelMinutesToNext,
			String memo
	) {
		this.course = course;
		this.place = place;
		this.visitOrder = visitOrder;
		this.estimatedCost = estimatedCost != null ? estimatedCost : 0;
		this.stayMinutes = stayMinutes != null ? stayMinutes : 60;
		this.travelMinutesToNext = travelMinutesToNext != null ? travelMinutesToNext : 0;
		this.memo = memo;
	}

	void assignCourse(Course course) {
		this.course = course;
	}
}

