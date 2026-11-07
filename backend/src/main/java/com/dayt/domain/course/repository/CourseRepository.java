package com.dayt.domain.course.repository;

import java.util.List;
import java.util.Optional;

import com.dayt.domain.course.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, Long> {

	@Query("""
			SELECT DISTINCT c
			FROM Course c
			LEFT JOIN FETCH c.coursePlaces cp
			LEFT JOIN FETCH cp.place
			WHERE c.creatorId = :userId
			   OR (:coupleId IS NOT NULL AND c.coupleId = :coupleId)
			ORDER BY c.createdAt DESC
			""")
	List<Course> findAccessibleCoursesWithPlaces(
			@Param("userId") Long userId,
			@Param("coupleId") Long coupleId
	);

	@Query("""
			SELECT DISTINCT c
			FROM Course c
			LEFT JOIN FETCH c.coursePlaces cp
			LEFT JOIN FETCH cp.place
			WHERE c.id = :courseId
			""")
	Optional<Course> findWithPlacesById(@Param("courseId") Long courseId);

	@Query("""
			SELECT DISTINCT c
			FROM Course c
			LEFT JOIN FETCH c.coursePlaces cp
			LEFT JOIN FETCH cp.place
			WHERE c.shareToken = :shareToken
			""")
	Optional<Course> findWithPlacesByShareToken(@Param("shareToken") String shareToken);
}

