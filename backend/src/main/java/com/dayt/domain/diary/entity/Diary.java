package com.dayt.domain.diary.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.dayt.global.entity.BaseTimeEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Getter
@Entity
@Table(name = "diaries")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diary extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "couple_id")
	private Long coupleId;

	@Column(name = "author_id", nullable = false)
	private Long authorId;

	@Column(name = "course_id")
	private Long courseId;

	@Column(name = "date_at", nullable = false)
	private LocalDate dateAt;

	@Column(name = "title", length = 100, nullable = false)
	private String title;

	@Column(name = "content", columnDefinition = "TEXT", nullable = false)
	private String content;

	@OneToMany(mappedBy = "diary", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("displayOrder ASC")
	private List<DiaryImage> images = new ArrayList<>();

	@Builder
	private Diary(
			Long coupleId,
			Long authorId,
			Long courseId,
			LocalDate dateAt,
			String title,
			String content
	) {
		this.coupleId = coupleId;
		this.authorId = authorId;
		this.courseId = courseId;
		this.dateAt = dateAt;
		this.title = title;
		this.content = content;
	}

	public void updateContent(
			Long coupleId,
			Long courseId,
			LocalDate dateAt,
			String title,
			String content
	) {
		this.coupleId = coupleId;
		this.courseId = courseId;
		this.dateAt = dateAt;
		this.title = title;
		this.content = content;
	}

	public void replaceImages(List<String> imageUrls) {
		this.images.clear();
		if (imageUrls == null) {
			return;
		}
		int order = 1;
		for (String rawUrl : imageUrls) {
			if (rawUrl == null || rawUrl.isBlank()) {
				continue;
			}
			DiaryImage image = DiaryImage.builder()
					.imageUrl(rawUrl.trim())
					.displayOrder(order++)
					.build();
			image.assignDiary(this);
			this.images.add(image);
		}
	}
}

