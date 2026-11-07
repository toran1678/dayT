package com.dayt.domain.diary.repository;

import java.util.List;
import java.util.Optional;

import com.dayt.domain.diary.entity.Diary;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

	@EntityGraph(attributePaths = {"images"})
	@Query("""
			SELECT d FROM Diary d
			WHERE d.authorId = :userId
			   OR (:coupleId IS NOT NULL AND d.coupleId = :coupleId)
			ORDER BY d.dateAt DESC, d.id DESC
			""")
	List<Diary> findAccessibleDiaries(
			@Param("userId") Long userId,
			@Param("coupleId") Long coupleId,
			Pageable pageable
	);

	@EntityGraph(attributePaths = {"images"})
	Optional<Diary> findWithImagesById(Long id);
}

