package com.dayt.domain.pet.entity;

import java.time.LocalDate;

import com.dayt.global.entity.BaseTimeEntity;
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
@Table(name = "couple_pets")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CouplePet extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "couple_id", nullable = false, unique = true)
	private Long coupleId;

	@Column(name = "name", length = 50, nullable = false)
	private String name;

	@Column(name = "character_type", length = 30, nullable = false)
	private String characterType;

	@Column(name = "level", nullable = false)
	private Integer level;

	@Column(name = "exp", nullable = false)
	private Integer exp;

	@Column(name = "last_met_date")
	private LocalDate lastMetDate;

	@Column(name = "total_meet_days", nullable = false)
	private Integer totalMeetDays;

	@Builder
	private CouplePet(
			Long coupleId,
			String name,
			String characterType,
			Integer level,
			Integer exp,
			LocalDate lastMetDate,
			Integer totalMeetDays
	) {
		this.coupleId = coupleId;
		this.name = name != null ? name : "아기 삐약이";
		this.characterType = characterType != null ? characterType : "CHICK";
		this.level = level != null ? level : 1;
		this.exp = exp != null ? exp : 0;
		this.lastMetDate = lastMetDate;
		this.totalMeetDays = totalMeetDays != null ? totalMeetDays : 0;
	}

	public static CouplePet createInitial(Long coupleId) {
		return CouplePet.builder()
				.coupleId(coupleId)
				.name("아기 삐약이")
				.characterType("CHICK")
				.level(1)
				.exp(0)
				.totalMeetDays(0)
				.build();
	}

	public int getNextLevelExp() {
		return Math.max(1, this.level) * 100;
	}

	public void checkIn(LocalDate today, int rewardExp) {
		this.lastMetDate = today;
		this.totalMeetDays = (this.totalMeetDays != null ? this.totalMeetDays : 0) + 1;
		gainExp(rewardExp);
	}

	public void gainExp(int amount) {
		if (amount <= 0) {
			return;
		}
		this.exp = (this.exp != null ? this.exp : 0) + amount;
		while (this.exp >= getNextLevelExp()) {
			this.exp -= getNextLevelExp();
			this.level += 1;
			applyEvolutionStage();
		}
	}

	private void applyEvolutionStage() {
		if (this.level == 2) {
			this.characterType = "LOVEBIRD";
			this.name = "설렘 앵무";
		}
		else if (this.level == 3) {
			this.characterType = "SWAN";
			this.name = "로맨틱 백조";
		}
		else if (this.level >= 4) {
			this.characterType = "PHOENIX";
			this.name = "전설의 불사조";
		}
	}
}

