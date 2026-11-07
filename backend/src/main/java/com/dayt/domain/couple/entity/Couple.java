package com.dayt.domain.couple.entity;

import java.time.LocalDate;

import com.dayt.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "couples")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Couple extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "invite_code", length = 20, nullable = false, unique = true)
	private String inviteCode;

	@Column(name = "started_date")
	private LocalDate startedDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", length = 20, nullable = false)
	private CoupleStatus status;

	@Builder
	private Couple(String inviteCode, LocalDate startedDate, CoupleStatus status) {
		this.inviteCode = inviteCode;
		this.startedDate = startedDate;
		this.status = status != null ? status : CoupleStatus.PENDING;
	}

	public void connect(LocalDate startedDate) {
		this.status = CoupleStatus.CONNECTED;
		if (startedDate != null) {
			this.startedDate = startedDate;
		}
	}
}

