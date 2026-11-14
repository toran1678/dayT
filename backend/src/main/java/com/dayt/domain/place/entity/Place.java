package com.dayt.domain.place.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.dayt.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

@Getter
@Entity
@Table(name = "places")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place extends BaseTimeEntity {

	private static final GeometryFactory WGS84_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "external_provider", length = 20, nullable = false)
	private ExternalPlaceProvider externalProvider;

	@Column(name = "external_place_id", length = 100, nullable = false)
	private String externalPlaceId;

	@Column(name = "name", length = 150, nullable = false)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "category_group", length = 30, nullable = false)
	private PlaceCategoryGroup categoryGroup;

	@Convert(converter = FoodCategoryAttributeConverter.class)
	@Column(name = "food_category", length = 30)
	private FoodCategory foodCategory;

	@Column(name = "sub_category", length = 100)
	private String subCategory;

	@Column(name = "address", length = 255, nullable = false)
	private String address;

	@Column(name = "region_keyword", length = 50)
	private String regionKeyword;

	@Column(name = "latitude", nullable = false)
	private Double latitude;

	@Column(name = "longitude", nullable = false)
	private Double longitude;

	@JdbcTypeCode(SqlTypes.GEOGRAPHY)
	@Column(name = "location", columnDefinition = "geography(Point,4326)", nullable = false)
	private Point location;

	@Column(name = "phone", length = 30)
	private String phone;

	@Column(name = "place_url", columnDefinition = "TEXT")
	private String placeUrl;

	@Column(name = "thumbnail_url", columnDefinition = "TEXT")
	private String thumbnailUrl;

	@Column(name = "avg_price_per_person")
	private Integer avgPricePerPerson;

	@Column(name = "is_indoor")
	private Boolean isIndoor;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "hashtags", columnDefinition = "jsonb", nullable = false)
	private List<String> hashtags = new ArrayList<>();

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "recommended_menus", columnDefinition = "jsonb", nullable = false)
	private List<String> recommendedMenus = new ArrayList<>();

	@Column(name = "ai_summary", length = 300)
	private String aiSummary;

	@Column(name = "event_start_date")
	private LocalDate eventStartDate;

	@Column(name = "event_end_date")
	private LocalDate eventEndDate;

	@Column(name = "ai_enriched_at")
	private Instant aiEnrichedAt;

	@Builder
	private Place(
			ExternalPlaceProvider externalProvider,
			String externalPlaceId,
			String name,
			PlaceCategoryGroup categoryGroup,
			FoodCategory foodCategory,
			String subCategory,
			String address,
			String regionKeyword,
			Double latitude,
			Double longitude,
			String phone,
			String placeUrl,
			String thumbnailUrl,
			Integer avgPricePerPerson,
			Boolean isIndoor,
			List<String> hashtags,
			List<String> recommendedMenus,
			String aiSummary,
			LocalDate eventStartDate,
			LocalDate eventEndDate
	) {
		this.externalProvider = externalProvider;
		this.externalPlaceId = externalPlaceId;
		this.name = name;
		this.categoryGroup = categoryGroup;
		this.foodCategory = foodCategory;
		this.subCategory = subCategory;
		this.address = address;
		this.regionKeyword = regionKeyword;
		this.latitude = latitude;
		this.longitude = longitude;
		this.location = createWgs84Point(longitude, latitude);
		this.phone = phone;
		this.placeUrl = placeUrl;
		this.thumbnailUrl = thumbnailUrl;
		this.avgPricePerPerson = avgPricePerPerson;
		this.isIndoor = isIndoor;
		this.hashtags = (hashtags != null) ? new ArrayList<>(hashtags) : new ArrayList<>();
		this.recommendedMenus = (recommendedMenus != null) ? new ArrayList<>(recommendedMenus) : new ArrayList<>();
		this.aiSummary = aiSummary;
		this.eventStartDate = eventStartDate;
		this.eventEndDate = eventEndDate;
	}

	public void refreshBasicMetadata(
			String name,
			String address,
			String regionKeyword,
			Double latitude,
			Double longitude,
			String phone,
			String placeUrl
	) {
		this.name = name;
		this.address = address;
		if (regionKeyword != null && !regionKeyword.isBlank()) {
			this.regionKeyword = regionKeyword;
		}
		this.latitude = latitude;
		this.longitude = longitude;
		this.location = createWgs84Point(longitude, latitude);
		if (phone != null && !phone.isBlank()) {
			this.phone = phone;
		}
		if (placeUrl != null && !placeUrl.isBlank()) {
			this.placeUrl = placeUrl;
		}
	}

	public void updateFestivalInfo(
			String name,
			String address,
			String regionKeyword,
			Double latitude,
			Double longitude,
			String phone,
			String placeUrl,
			String thumbnailUrl,
			LocalDate eventStartDate,
			LocalDate eventEndDate
	) {
		this.name = name;
		this.address = address;
		if (regionKeyword != null && !regionKeyword.isBlank()) {
			this.regionKeyword = regionKeyword;
		}
		this.latitude = latitude;
		this.longitude = longitude;
		this.location = createWgs84Point(longitude, latitude);
		if (phone != null && !phone.isBlank()) {
			this.phone = phone;
		}
		if (placeUrl != null && !placeUrl.isBlank()) {
			this.placeUrl = placeUrl;
		}
		if (thumbnailUrl != null && !thumbnailUrl.isBlank()) {
			this.thumbnailUrl = thumbnailUrl;
		}
		this.eventStartDate = eventStartDate;
		this.eventEndDate = eventEndDate;
	}

	public void applyAiEnrichment(
			List<String> hashtags,
			List<String> recommendedMenus,
			Integer avgPricePerPerson,
			Boolean isIndoor,
			String oneLineSummary,
			Instant enrichedAt
	) {
		if (hashtags != null && !hashtags.isEmpty()) {
			this.hashtags = new ArrayList<>(hashtags);
		}
		if (recommendedMenus != null && !recommendedMenus.isEmpty()) {
			this.recommendedMenus = new ArrayList<>(recommendedMenus);
		}
		if (avgPricePerPerson != null && this.avgPricePerPerson == null) {
			this.avgPricePerPerson = avgPricePerPerson;
		}
		if (isIndoor != null && this.isIndoor == null) {
			this.isIndoor = isIndoor;
		}
		if (oneLineSummary != null && !oneLineSummary.isBlank()) {
			this.aiSummary = oneLineSummary.length() > 300
					? oneLineSummary.substring(0, 300)
					: oneLineSummary;
		}
		this.aiEnrichedAt = enrichedAt;
	}

	public void applyVerifiedPrice(int verifiedPrice, String rangeHashtag) {
		this.avgPricePerPerson = verifiedPrice;
		if (rangeHashtag != null && !rangeHashtag.isBlank() && !this.hashtags.contains(rangeHashtag)) {
			List<String> updated = new ArrayList<>();
			updated.add(rangeHashtag);
			updated.addAll(this.hashtags);
			this.hashtags = updated.size() > 6 ? new ArrayList<>(updated.subList(0, 6)) : updated;
		}
	}

	public static Point createWgs84Point(double longitude, double latitude) {
		Point point = WGS84_FACTORY.createPoint(new Coordinate(longitude, latitude));
		point.setSRID(4326);
		return point;
	}
}

