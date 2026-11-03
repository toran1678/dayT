package com.dayt.domain.auth.token;

import java.time.Duration;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisRefreshTokenStore implements RefreshTokenStore {

	private static final String KEY_PREFIX = "dayt:auth:refresh:";

	private final StringRedisTemplate redisTemplate;

	@Override
	public void save(Long userId, String refreshToken, Duration ttl) {
		redisTemplate.opsForValue().set(key(userId), refreshToken, ttl);
	}

	@Override
	public Optional<String> findByUserId(Long userId) {
		return Optional.ofNullable(redisTemplate.opsForValue().get(key(userId)));
	}

	@Override
	public void deleteByUserId(Long userId) {
		redisTemplate.delete(key(userId));
	}

	private static String key(Long userId) {
		return KEY_PREFIX + userId;
	}
}

