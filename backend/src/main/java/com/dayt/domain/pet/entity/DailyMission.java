package com.dayt.domain.pet.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "daily_missions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyMission {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "title", length = 100, nullable = false)
	private String title;

	@Column(name = "description", length = 255, nullable = false)
	private String description;

	@Column(name = "reward_exp", nullable = false)
	private Integer rewardExp;

	@Column(name = "is_active", nullable = false)
	private Boolean isActive;

	@Builder
	private DailyMission(String title, String description, Integer rewardExp, Boolean isActive) {
		this.title = title;
		this.description = description;
		this.rewardExp = rewardExp != null ? rewardExp : 15;
		this.isActive = isActive != null ? isActive : true;
	}
}

