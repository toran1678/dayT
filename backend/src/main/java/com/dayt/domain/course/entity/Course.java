package com.dayt.domain.course.entity;

import java.util.ArrayList;
import java.util.List;

import com.dayt.global.entity.BaseTimeEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "courses")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Course extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "creator_id", nullable = false)
	private Long creatorId;

	@Column(name = "couple_id")
	private Long coupleId;

	@Column(name = "title", length = 100, nullable = false)
	private String title;

	@Column(name = "description", columnDefinition = "TEXT")
	private String description;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "theme_tags", columnDefinition = "jsonb", nullable = false)
	private List<String> themeTags = new ArrayList<>();

	@Enumerated(EnumType.STRING)
	@Column(name = "time_slot", length = 20)
	private DateTimeSlot timeSlot;

	@Column(name = "total_estimated_cost", nullable = false)
	private Integer totalEstimatedCost;

	@Column(name = "total_duration_minutes", nullable = false)
	private Integer totalDurationMinutes;

	@Enumerated(EnumType.STRING)
	@Column(name = "source_type", length = 20, nullable = false)
	private CourseSourceType sourceType;

	@Column(name = "share_token", length = 64, nullable = false, unique = true)
	private String shareToken;

	@Column(name = "is_collab_open", nullable = false)
	private Boolean isCollabOpen;

	@OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("visitOrder ASC")
	private List<CoursePlace> coursePlaces = new ArrayList<>();

	@Builder
	private Course(
			Long creatorId,
			Long coupleId,
			String title,
			String description,
			List<String> themeTags,
			DateTimeSlot timeSlot,
			Integer totalEstimatedCost,
			Integer totalDurationMinutes,
			CourseSourceType sourceType,
			String shareToken,
			Boolean isCollabOpen
	) {
		this.creatorId = creatorId;
		this.coupleId = coupleId;
		this.title = title;
		this.description = description;
		this.themeTags = themeTags != null ? new ArrayList<>(themeTags) : new ArrayList<>();
		this.timeSlot = timeSlot;
		this.totalEstimatedCost = totalEstimatedCost != null ? totalEstimatedCost : 0;
		this.totalDurationMinutes = totalDurationMinutes != null ? totalDurationMinutes : 0;
		this.sourceType = sourceType != null ? sourceType : CourseSourceType.CUSTOM;
		this.shareToken = shareToken;
		this.isCollabOpen = isCollabOpen != null ? isCollabOpen : false;
	}

	public void replacePlaces(List<CoursePlace> nextPlaces, int totalEstimatedCost, int totalDurationMinutes) {
		this.coursePlaces.clear();
		for (CoursePlace cp : nextPlaces) {
			cp.assignCourse(this);
			this.coursePlaces.add(cp);
		}
		this.totalEstimatedCost = totalEstimatedCost;
		this.totalDurationMinutes = totalDurationMinutes;
	}

	public void updateHeader(
			Long coupleId,
			String title,
			String description,
			List<String> themeTags,
			DateTimeSlot timeSlot,
			CourseSourceType sourceType
	) {
		this.coupleId = coupleId;
		this.title = title;
		this.description = description;
		this.themeTags = themeTags != null ? new ArrayList<>(themeTags) : new ArrayList<>();
		this.timeSlot = timeSlot;
		if (sourceType != null) {
			this.sourceType = sourceType;
		}
	}

	public void updateCollaboration(boolean open) {
		this.isCollabOpen = open;
	}

	public void linkCoupleIfAbsent(Long coupleId) {
		if (this.coupleId == null && coupleId != null) {
			this.coupleId = coupleId;
		}
	}
}

