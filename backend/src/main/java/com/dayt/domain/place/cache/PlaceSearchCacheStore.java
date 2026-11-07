package com.dayt.domain.place.cache;

import java.time.Duration;
import java.util.Optional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PlaceSearchCacheStore {

	private static final String SEARCH_KEY_PREFIX = "dayt:places:search:";
	private static final String SYNC_KEY_PREFIX = "dayt:places:synced:";
	private static final String GOOGLE_PRICE_KEY_PREFIX = "dayt:places:gprice:";
	private static final Duration SEARCH_TTL = Duration.ofMinutes(10);
	private static final Duration SYNC_TTL = Duration.ofMinutes(30);
	private static final Duration GOOGLE_PRICE_CHECK_TTL = Duration.ofHours(24);

	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	public PlaceSearchCacheStore(StringRedisTemplate redisTemplate) {
		this.redisTemplate = redisTemplate;
		this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
	}

	public <T> Optional<T> getCached(String cacheKey, Class<T> targetType) {
		try {
			String raw = redisTemplate.opsForValue().get(SEARCH_KEY_PREFIX + cacheKey);
			if (raw == null || raw.isBlank()) {
				return Optional.empty();
			}
			return Optional.of(objectMapper.readValue(raw, targetType));
		}
		catch (Exception ex) {
			log.debug("Place cache read miss/error for key={}: {}", cacheKey, ex.getMessage());
			return Optional.empty();
		}
	}

	public void putCached(String cacheKey, Object payload) {
		try {
			String json = objectMapper.writeValueAsString(payload);
			redisTemplate.opsForValue().set(SEARCH_KEY_PREFIX + cacheKey, json, SEARCH_TTL);
		}
		catch (JsonProcessingException ex) {
			log.debug("Failed to serialize place search cache for key={}", cacheKey);
		}
	}

	public boolean isRecentlySynced(String syncKey) {
		return Boolean.TRUE.equals(redisTemplate.hasKey(SYNC_KEY_PREFIX + syncKey));
	}

	public void markSynced(String syncKey) {
		redisTemplate.opsForValue().set(SYNC_KEY_PREFIX + syncKey, "1", SYNC_TTL);
	}

	public boolean isGooglePriceChecked(Long placeId) {
		if (placeId == null) {
			return true;
		}
		return Boolean.TRUE.equals(redisTemplate.hasKey(GOOGLE_PRICE_KEY_PREFIX + placeId));
	}

	public void markGooglePriceChecked(Long placeId) {
		if (placeId == null) {
			return;
		}
		redisTemplate.opsForValue().set(GOOGLE_PRICE_KEY_PREFIX + placeId, "1", GOOGLE_PRICE_CHECK_TTL);
	}
}

