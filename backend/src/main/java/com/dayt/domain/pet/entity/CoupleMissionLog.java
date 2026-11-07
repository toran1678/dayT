package com.dayt.domain.pet.entity;

import java.time.Instant;
import java.time.LocalDate;

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
@Table(name = "couple_mission_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoupleMissionLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "couple_id", nullable = false)
	private Long coupleId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "mission_id", nullable = false)
	private DailyMission mission;

	@Column(name = "assigned_date", nullable = false)
	private LocalDate assignedDate;

	@Column(name = "is_completed", nullable = false)
	private Boolean isCompleted;

	@Column(name = "completed_at")
	private Instant completedAt;

	@Builder
	private CoupleMissionLog(
			Long coupleId,
			DailyMission mission,
			LocalDate assignedDate,
			Boolean isCompleted,
			Instant completedAt
	) {
		this.coupleId = coupleId;
		this.mission = mission;
		this.assignedDate = assignedDate;
		this.isCompleted = isCompleted != null ? isCompleted : false;
		this.completedAt = completedAt;
	}

	public boolean markCompleted(Instant now) {
		if (Boolean.TRUE.equals(this.isCompleted)) {
			return false;
		}
		this.isCompleted = true;
		this.completedAt = now;
		return true;
	}
}

