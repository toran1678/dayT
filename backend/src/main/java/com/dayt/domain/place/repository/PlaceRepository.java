package com.dayt.domain.place.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import com.dayt.domain.place.entity.ExternalPlaceProvider;
import com.dayt.domain.place.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceRepository extends JpaRepository<Place, Long> {

	Optional<Place> findByExternalProviderAndExternalPlaceId(
			ExternalPlaceProvider externalProvider,
			String externalPlaceId
	);

	@Query(value = """
			SELECT * FROM places p
			WHERE p.category_group = 'EXHIBITION'
			  AND p.event_start_date IS NOT NULL
			  AND p.event_end_date IS NOT NULL
			  AND (:targetDate IS NULL OR (p.event_start_date <= :targetDate AND p.event_end_date >= :targetDate))
			  AND (:lon IS NULL OR :lat IS NULL OR ST_DWithin(p.location, CAST(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) AS geography), :radiusMeters))
			ORDER BY CASE WHEN :lon IS NOT NULL AND :lat IS NOT NULL
			              THEN ST_Distance(p.location, CAST(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) AS geography))
			              ELSE 0 END ASC, p.id ASC
			LIMIT :limitCount
			""", nativeQuery = true)
	List<Place> findActiveFestivalsNear(
			@Param("lat") Double lat,
			@Param("lon") Double lon,
			@Param("radiusMeters") double radiusMeters,
			@Param("targetDate") LocalDate targetDate,
			@Param("limitCount") int limitCount
	);
}

