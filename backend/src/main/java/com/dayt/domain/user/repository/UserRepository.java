package com.dayt.domain.user.repository;

import java.util.List;
import java.util.Optional;

import com.dayt.domain.user.entity.OAuthProvider;
import com.dayt.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByOauthProviderAndOauthId(OAuthProvider oauthProvider, String oauthId);

	boolean existsByEmail(String email);

	List<User> findAllByCoupleId(Long coupleId);
}

