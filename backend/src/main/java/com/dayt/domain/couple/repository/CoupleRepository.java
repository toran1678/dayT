package com.dayt.domain.couple.repository;

import java.util.Optional;

import com.dayt.domain.couple.entity.Couple;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoupleRepository extends JpaRepository<Couple, Long> {

	Optional<Couple> findByInviteCode(String inviteCode);

	boolean existsByInviteCode(String inviteCode);
}

