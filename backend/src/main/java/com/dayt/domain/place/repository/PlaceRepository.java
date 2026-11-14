package com.dayt.domain.place.repository;

import java.util.Optional;

import com.dayt.domain.place.entity.ExternalPlaceProvider;
import com.dayt.domain.place.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceRepository extends JpaRepository<Place, Long> {

	Optional<Place> findByExternalProviderAndExternalPlaceId(
			ExternalPlaceProvider externalProvider,
			String externalPlaceId
	);

	long countByExternalProvider(ExternalPlaceProvider externalProvider);

	java.util.List<Place> findAllByExternalProvider(ExternalPlaceProvider externalProvider);
}

