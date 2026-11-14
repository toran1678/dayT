package com.dayt.domain.place.repository;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.Place;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class PlaceQueryRepository {

	private final EntityManager entityManager;

	public record SearchCriteria(
			String keyword,
			Double latitude,
			Double longitude,
			int radiusMeters,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory,
			Integer maxPricePerPerson,
			Boolean isIndoor,
			int page,
			int size
	) {
	}

	@SuppressWarnings("unchecked")
	public List<Place> searchPlaces(SearchCriteria criteria) {
		StringBuilder sql = new StringBuilder("SELECT p.* FROM places p WHERE 1=1 ");
		Map<String, Object> params = new HashMap<>();

		// 지난 행사는 자동 제외 (종료일이 오늘보다 이전인 지난 행사 제외)
		sql.append(" AND (p.event_end_date IS NULL OR p.event_end_date >= CURRENT_DATE)");

		boolean hasCoordinates = criteria.latitude() != null && criteria.longitude() != null;
		if (hasCoordinates) {
			sql.append(" AND ST_DWithin(p.location, CAST(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geography), :radiusMeters)");
			params.put("lng", criteria.longitude());
			params.put("lat", criteria.latitude());
			params.put("radiusMeters", criteria.radiusMeters());
		}
		else if (criteria.keyword() != null && !criteria.keyword().isBlank()) {
			sql.append(" AND (\n")
					.append("     p.region_keyword ILIKE :kw\n")
					.append("     OR p.address ILIKE :kw\n")
					.append("     OR p.name ILIKE :kw\n")
					.append("     OR p.sub_category ILIKE :kw\n")
					.append(" )");
			params.put("kw", "%" + stripStationSuffix(criteria.keyword().trim()) + "%");
		}

		if (criteria.categoryGroup() != null) {
			sql.append(" AND p.category_group = :categoryGroup");
			params.put("categoryGroup", criteria.categoryGroup().name());
		}

		if (criteria.foodCategory() != null) {
			sql.append(" AND p.food_category = :foodCategory");
			params.put("foodCategory", criteria.foodCategory().getLabel());
		}

		if (criteria.maxPricePerPerson() != null) {
			sql.append(" AND (p.avg_price_per_person IS NULL OR p.avg_price_per_person <= :maxPrice)");
			params.put("maxPrice", criteria.maxPricePerPerson());
		}

		if (criteria.isIndoor() != null) {
			sql.append(" AND p.is_indoor = :isIndoor");
			params.put("isIndoor", criteria.isIndoor());
		}

		String pricePriorityPrefix = criteria.maxPricePerPerson() != null
				? "CASE WHEN p.avg_price_per_person IS NULL THEN 1 ELSE 0 END ASC, "
				: "";

		if (hasCoordinates) {
			sql.append(" ORDER BY ")
					.append(pricePriorityPrefix)
					.append("ST_Distance(p.location, CAST(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geography)) ASC, p.id ASC");
		}
		else {
			sql.append(" ORDER BY ")
					.append(pricePriorityPrefix)
					.append("p.id ASC");
		}

		int safeSize = Math.max(1, Math.min(criteria.size(), 50));
		int safeOffset = Math.max(0, criteria.page()) * safeSize;

		sql.append(" LIMIT :limitPlusOne OFFSET :offset");
		params.put("limitPlusOne", safeSize + 1);
		params.put("offset", safeOffset);

		Query nativeQuery = entityManager.createNativeQuery(sql.toString(), Place.class);
		params.forEach(nativeQuery::setParameter);

		return (List<Place>) nativeQuery.getResultList();
	}

	@SuppressWarnings("unchecked")
	public List<Place> findActiveFestivalsNear(
			Double lat,
			Double lon,
			double radiusMeters,
			LocalDate targetDate,
			int limitCount
	) {
		StringBuilder sql = new StringBuilder("""
				SELECT p.* FROM places p
				WHERE p.category_group = 'EXHIBITION'
				  AND p.event_start_date IS NOT NULL
				  AND p.event_end_date IS NOT NULL
				""");
		Map<String, Object> params = new HashMap<>();

		if (targetDate != null) {
			sql.append(" AND p.event_start_date <= :targetDate AND p.event_end_date >= :targetDate");
			params.put("targetDate", targetDate);
		}

		boolean hasCoordinates = lat != null && lon != null;
		if (hasCoordinates) {
			sql.append(" AND ST_DWithin(p.location, CAST(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) AS geography), :radiusMeters)");
			params.put("lat", lat);
			params.put("lon", lon);
			params.put("radiusMeters", radiusMeters);
			sql.append(" ORDER BY ST_Distance(p.location, CAST(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) AS geography)) ASC, p.id ASC");
		}
		else {
			sql.append(" ORDER BY p.id ASC");
		}

		sql.append(" LIMIT :limitCount");
		params.put("limitCount", Math.max(1, limitCount));

		Query nativeQuery = entityManager.createNativeQuery(sql.toString(), Place.class);
		params.forEach(nativeQuery::setParameter);

		return (List<Place>) nativeQuery.getResultList();
	}

	@SuppressWarnings("unchecked")
	public List<Place> findActiveFestivalsInBounds(
			Double minLat,
			Double maxLat,
			Double minLng,
			Double maxLng,
			int limitCount
	) {
		StringBuilder sql = new StringBuilder("""
				SELECT p.* FROM places p
				WHERE (p.sub_category = '축제·행사' OR (p.category_group = 'EXHIBITION' AND p.event_start_date IS NOT NULL))
				""");
		Map<String, Object> params = new HashMap<>();

		if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
			sql.append(" AND p.latitude >= :minLat AND p.latitude <= :maxLat AND p.longitude >= :minLng AND p.longitude <= :maxLng");
			params.put("minLat", minLat);
			params.put("maxLat", maxLat);
			params.put("minLng", minLng);
			params.put("maxLng", maxLng);
		}

		sql.append(" ORDER BY (CASE WHEN p.thumbnail_url IS NOT NULL AND p.thumbnail_url != '' THEN 0 ELSE 1 END), p.event_start_date ASC, p.id ASC");
		sql.append(" LIMIT :limitCount");
		params.put("limitCount", Math.max(1, Math.min(limitCount, 1000)));

		Query nativeQuery = entityManager.createNativeQuery(sql.toString(), Place.class);
		params.forEach(nativeQuery::setParameter);

		return (List<Place>) nativeQuery.getResultList();
	}

	private static String stripStationSuffix(String rawKeyword) {
		if (rawKeyword.length() > 2 && rawKeyword.endsWith("역")) {
			return rawKeyword.substring(0, rawKeyword.length() - 1);
		}
		return rawKeyword;
	}
}

