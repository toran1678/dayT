package com.dayt.domain.diary.entity;

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
@Table(name = "diary_images")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiaryImage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "diary_id", nullable = false)
	private Diary diary;

	@Column(name = "image_url", columnDefinition = "TEXT", nullable = false)
	private String imageUrl;

	@Column(name = "display_order", nullable = false)
	private Integer displayOrder;

	@Builder
	private DiaryImage(String imageUrl, Integer displayOrder) {
		this.imageUrl = imageUrl;
		this.displayOrder = displayOrder != null ? displayOrder : 1;
	}

	void assignDiary(Diary diary) {
		this.diary = diary;
	}
}

