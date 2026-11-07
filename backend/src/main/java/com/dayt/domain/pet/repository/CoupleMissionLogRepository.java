package com.dayt.domain.pet.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import com.dayt.domain.pet.entity.CoupleMissionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CoupleMissionLogRepository extends JpaRepository<CoupleMissionLog, Long> {

	@Query("""
			SELECT l FROM CoupleMissionLog l
			JOIN FETCH l.mission m
			WHERE l.coupleId = :coupleId AND l.assignedDate = :assignedDate
			ORDER BY l.id ASC
			""")
	List<CoupleMissionLog> findAllWithMissionByCoupleIdAndAssignedDate(
			@Param("coupleId") Long coupleId,
			@Param("assignedDate") LocalDate assignedDate
	);

	@Query("""
			SELECT l FROM CoupleMissionLog l
			JOIN FETCH l.mission m
			WHERE l.id = :id
			""")
	Optional<CoupleMissionLog> findWithMissionById(@Param("id") Long id);
}

