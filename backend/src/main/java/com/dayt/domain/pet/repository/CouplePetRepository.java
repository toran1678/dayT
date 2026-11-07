package com.dayt.domain.pet.repository;

import java.util.Optional;

import com.dayt.domain.pet.entity.CouplePet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouplePetRepository extends JpaRepository<CouplePet, Long> {

	Optional<CouplePet> findByCoupleId(Long coupleId);
}

