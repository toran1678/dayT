package com.dayt.domain.pet.repository;

import java.util.List;

import com.dayt.domain.pet.entity.DailyMission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyMissionRepository extends JpaRepository<DailyMission, Long> {

	List<DailyMission> findAllByIsActiveTrueOrderByIdAsc();
}

