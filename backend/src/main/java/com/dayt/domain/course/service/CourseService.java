package com.dayt.domain.course.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.dayt.domain.ai.client.AiServiceClient;
import com.dayt.domain.ai.dto.InternalAiCourseGenerateRequest;
import com.dayt.domain.course.dto.CourseDetailResponse;
import com.dayt.domain.course.dto.CourseListItem;
import com.dayt.domain.course.dto.CoursePlaceDetailItem;
import com.dayt.domain.course.dto.CoursePlaceRequestItem;
import com.dayt.domain.course.dto.CourseRecommendRequest;
import com.dayt.domain.course.dto.CourseRecommendationPreviewResponse;
import com.dayt.domain.course.dto.CourseUpsertRequest;
import com.dayt.domain.course.dto.GoogleMapsLinkResponse;
import com.dayt.domain.course.dto.LatLngPoint;
import com.dayt.domain.course.entity.Course;
import com.dayt.domain.course.entity.CoursePlace;
import com.dayt.domain.course.entity.DateTheme;
import com.dayt.domain.course.entity.DateTimeSlot;
import com.dayt.domain.course.repository.CourseRepository;
import com.dayt.domain.place.dto.PlaceDetailResponse;
import com.dayt.domain.place.entity.Place;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import com.dayt.domain.place.repository.PlaceRepository;
import com.dayt.domain.place.service.PlaceService;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseService {

	private static final double EARTH_RADIUS_METERS = 6_371_000.0;
	private static final double URBAN_DETOUR_FACTOR = 1.25;
	private static final double WALKING_METERS_PER_MINUTE = 67.0;

	private final CourseRepository courseRepository;
	private final PlaceRepository placeRepository;
	private final PlaceService placeService;
	private final AiServiceClient aiServiceClient;
	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public List<CourseListItem> getMyCourses(Long userId) {
		User user = getRequiredUser(userId);
		return courseRepository.findAccessibleCoursesWithPlaces(user.getId(), user.getCoupleId())
				.stream()
				.map(CourseListItem::from)
				.toList();
	}

	@Transactional
	public CourseDetailResponse createCourse(Long userId, CourseUpsertRequest request) {
		User user = getRequiredUser(userId);
		PreparedStops prepared = prepareStops(request.places());

		Long coupleId = Boolean.TRUE.equals(request.shareWithCouple()) ? user.getCoupleId() : null;
		List<String> themeLabels = extractThemeLabels(request.themeTags());

		Course course = Course.builder()
				.creatorId(user.getId())
				.coupleId(coupleId)
				.title(request.title().trim())
				.description(trimOrNull(request.description()))
				.themeTags(themeLabels)
				.timeSlot(request.timeSlot())
				.totalEstimatedCost(prepared.totalEstimatedCost())
				.totalDurationMinutes(prepared.totalDurationMinutes())
				.sourceType(request.sourceType())
				.shareToken(generateShareToken())
				.isCollabOpen(false)
				.build();

		course.replacePlaces(
				prepared.coursePlaces(),
				prepared.totalEstimatedCost(),
				prepared.totalDurationMinutes()
		);

		Course saved = courseRepository.saveAndFlush(course);
		return CourseDetailResponse.from(saved);
	}

	@Transactional
	public CourseRecommendationPreviewResponse recommendCourse(Long userId, CourseRecommendRequest request) {
		getRequiredUser(userId);

		Boolean rainyFilter = isIndoorMoodRequested(request.moodKeywords()) ? Boolean.TRUE : null;
		List<PlaceDetailResponse> candidates = placeService.searchPlaces(
				request.regionKeyword().trim(),
				request.latitude(),
				request.longitude(),
				2500,
				null,
				null,
				null,
				rainyFilter,
				0,
				24
		).items();

		if (candidates.size() < 2) {
			candidates = placeService.searchPlaces(
					request.regionKeyword().trim(),
					request.latitude(),
					request.longitude(),
					6000,
					null,
					null,
					null,
					null,
					0,
					24
			).items();
		}

		if (candidates.isEmpty()) {
			candidates = placeRepository.findAll().stream()
					.limit(20)
					.map(PlaceDetailResponse::from)
					.toList();
		}

		if (candidates.isEmpty()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "추천할 수 있는 주변 후보 장소가 아직 없습니다.");
		}

		Optional<CourseRecommendationPreviewResponse> aiResult = aiServiceClient.generateCourse(
				new InternalAiCourseGenerateRequest(request, candidates)
		);
		if (aiResult.isPresent()) {
			return aiResult.get();
		}

		return buildBackendFallbackPreview(request, candidates);
	}

	@Transactional(readOnly = true)
	public CourseDetailResponse getCourseDetail(Long userId, Long courseId) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findWithPlacesById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "코스를 찾을 수 없습니다."));

		if (!canViewCourse(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스를 조회할 권한이 없습니다.");
		}
		return CourseDetailResponse.from(course);
	}

	@Transactional(readOnly = true)
	public CourseDetailResponse getSharedCourse(String shareToken) {
		Course course = courseRepository.findWithPlacesByShareToken(shareToken)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "공유된 코스를 찾을 수 없습니다."));
		return CourseDetailResponse.from(course);
	}

	@Transactional(readOnly = true)
	public GoogleMapsLinkResponse getGoogleMapsLink(Long userId, Long courseId) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findWithPlacesById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "코스를 찾을 수 없습니다."));

		if (!canViewCourse(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스의 길안내 링크를 조회할 권한이 없습니다.");
		}

		List<CoursePlace> sorted = course.getCoursePlaces().stream()
				.sorted(Comparator.comparingInt(CoursePlace::getVisitOrder))
				.toList();

		if (sorted.isEmpty()) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "코스에 경유지가 없습니다.");
		}

		if (sorted.size() == 1) {
			Place only = sorted.getFirst().getPlace();
			String coord = "%s,%s".formatted(only.getLatitude(), only.getLongitude());
			String webUrl = "https://www.google.com/maps/search/?api=1&query="
					+ URLEncoder.encode(coord, StandardCharsets.UTF_8);
			String deepUrl = "comgooglemaps://?q=" + URLEncoder.encode(coord, StandardCharsets.UTF_8);
			return new GoogleMapsLinkResponse(deepUrl, webUrl);
		}

		Place first = sorted.getFirst().getPlace();
		Place last = sorted.getLast().getPlace();
		String origin = "%s,%s".formatted(first.getLatitude(), first.getLongitude());
		String destination = "%s,%s".formatted(last.getLatitude(), last.getLongitude());

		String waypoints = sorted.subList(1, sorted.size() - 1).stream()
				.map(cp -> "%s,%s".formatted(cp.getPlace().getLatitude(), cp.getPlace().getLongitude()))
				.collect(Collectors.joining("|"));

		StringBuilder webBuilder = new StringBuilder("https://www.google.com/maps/dir/?api=1")
				.append("&origin=").append(URLEncoder.encode(origin, StandardCharsets.UTF_8))
				.append("&destination=").append(URLEncoder.encode(destination, StandardCharsets.UTF_8));
		if (!waypoints.isEmpty()) {
			webBuilder.append("&waypoints=").append(URLEncoder.encode(waypoints, StandardCharsets.UTF_8));
		}
		webBuilder.append("&travelmode=walking");
		String webUrl = webBuilder.toString();

		String daddrChain = sorted.subList(1, sorted.size()).stream()
				.map(cp -> "%s,%s".formatted(cp.getPlace().getLatitude(), cp.getPlace().getLongitude()))
				.collect(Collectors.joining("+to:"));
		String deepUrl = "comgooglemaps://?saddr=%s&daddr=%s&directionsmode=walking".formatted(
				URLEncoder.encode(origin, StandardCharsets.UTF_8),
				daddrChain
		);

		return new GoogleMapsLinkResponse(deepUrl, webUrl);
	}

	@Transactional
	public CourseDetailResponse updateCourse(Long userId, Long courseId, CourseUpsertRequest request) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findWithPlacesById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "수정할 코스를 찾을 수 없습니다."));

		if (!canModifyCourse(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스를 수정할 권한이 없습니다.");
		}

		PreparedStops prepared = prepareStops(request.places());
		Long nextCoupleId = Boolean.TRUE.equals(request.shareWithCouple())
				? (user.getCoupleId() != null ? user.getCoupleId() : course.getCoupleId())
				: null;

		course.updateHeader(
				nextCoupleId,
				request.title().trim(),
				trimOrNull(request.description()),
				extractThemeLabels(request.themeTags()),
				request.timeSlot(),
				request.sourceType()
		);

		course.getCoursePlaces().clear();
		courseRepository.flush();

		course.replacePlaces(
				prepared.coursePlaces(),
				prepared.totalEstimatedCost(),
				prepared.totalDurationMinutes()
		);

		Course saved = courseRepository.saveAndFlush(course);
		return CourseDetailResponse.from(saved);
	}

	@Transactional
	public void deleteCourse(Long userId, Long courseId) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "삭제할 코스를 찾을 수 없습니다."));

		if (!canModifyCourse(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스를 삭제할 권한이 없습니다.");
		}
		courseRepository.delete(course);
	}

	private CourseRecommendationPreviewResponse buildBackendFallbackPreview(
			CourseRecommendRequest req,
			List<PlaceDetailResponse> candidates
	) {
		int desiredCount = (req.timeSlot() == DateTimeSlot.ALL_DAY) ? 4 : 3;
		int targetCount = Math.min(desiredCount, candidates.size());

		List<PlaceDetailResponse> chosen = new ArrayList<>();
		Set<Long> usedIds = new HashSet<>();

		List<Set<PlaceCategoryGroup>> buckets = List.of(
				Set.of(PlaceCategoryGroup.RESTAURANT),
				Set.of(PlaceCategoryGroup.EXHIBITION, PlaceCategoryGroup.ACTIVITY, PlaceCategoryGroup.PARK),
				Set.of(PlaceCategoryGroup.CAFE)
		);

		for (Set<PlaceCategoryGroup> bucket : buckets) {
			if (chosen.size() >= targetCount) {
				break;
			}
			candidates.stream()
					.filter(c -> !usedIds.contains(c.id()) && bucket.contains(c.categoryGroup()))
					.filter(c -> req.foodCategories() == null || req.foodCategories().isEmpty()
							|| c.categoryGroup() != PlaceCategoryGroup.RESTAURANT
							|| (c.foodCategory() != null && req.foodCategories().contains(c.foodCategory())))
					.findFirst()
					.ifPresent(match -> {
						chosen.add(match);
						usedIds.add(match.id());
					});
		}

		for (PlaceDetailResponse candidate : candidates) {
			if (chosen.size() >= targetCount) {
				break;
			}
			if (!usedIds.contains(candidate.id())) {
				chosen.add(candidate);
				usedIds.add(candidate.id());
			}
		}

		List<CoursePlaceDetailItem> items = new ArrayList<>(chosen.size());
		List<LatLngPoint> polyline = new ArrayList<>(chosen.size());
		int totalCost = 0;
		int totalMinutes = 0;

		for (int i = 0; i < chosen.size(); i++) {
			PlaceDetailResponse p = chosen.get(i);
			boolean isLast = (i == chosen.size() - 1);
			int cost = (p.avgPricePerPerson() != null)
					? Math.max(0, p.avgPricePerPerson() * 2)
					: (p.categoryGroup() == PlaceCategoryGroup.CAFE ? 18000 : 32000);
			int stay = (p.categoryGroup() == PlaceCategoryGroup.RESTAURANT) ? 70
					: (p.categoryGroup() == PlaceCategoryGroup.CAFE ? 60 : 80);
			int travel = isLast ? 0 : estimateWalkingMinutesFromCoords(
					p.latitude(),
					p.longitude(),
					chosen.get(i + 1).latitude(),
					chosen.get(i + 1).longitude()
			);

			totalCost += cost;
			totalMinutes += stay + travel;

			String memo = (p.aiSummary() != null && !p.aiSummary().isBlank())
					? p.aiSummary()
					: (p.name() + " 시그니처 포인트 즐기기");

			items.add(new CoursePlaceDetailItem(i + 1, cost, stay, travel, memo, p));
			polyline.add(new LatLngPoint(p.latitude(), p.longitude()));
		}

		String themeLabel = req.themeTags().isEmpty() ? "맞춤 감성" : req.themeTags().getFirst().getLabel();
		String title = "%s %s 추천 데이트 코스".formatted(req.regionKeyword().trim(), themeLabel);
		String reason = "'%s' 주변 실존 스팟 중 예산(1인 %,d원)과 테마(%s)에 맞춰 도보 동선이 가장 자연스러운 %d곳을 조합했습니다."
				.formatted(req.regionKeyword().trim(), req.budgetPerPerson(), themeLabel, items.size());

		return new CourseRecommendationPreviewResponse(
				title,
				reason,
				totalCost,
				totalMinutes,
				items,
				polyline
		);
	}

	private static boolean isIndoorMoodRequested(List<String> moodKeywords) {
		if (moodKeywords == null || moodKeywords.isEmpty()) {
			return false;
		}
		for (String kw : moodKeywords) {
			if (kw != null && (kw.contains("비") || kw.contains("실내") || kw.contains("우천") || kw.contains("눈"))) {
				return true;
			}
		}
		return false;
	}

	private User getRequiredUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
	}

	private static boolean canViewCourse(Course course, User user) {
		if (Objects.equals(course.getCreatorId(), user.getId())) {
			return true;
		}
		if (course.getCoupleId() != null && Objects.equals(course.getCoupleId(), user.getCoupleId())) {
			return true;
		}
		return Boolean.TRUE.equals(course.getIsCollabOpen());
	}

	private static boolean canModifyCourse(Course course, User user) {
		if (Objects.equals(course.getCreatorId(), user.getId())) {
			return true;
		}
		return course.getCoupleId() != null && Objects.equals(course.getCoupleId(), user.getCoupleId());
	}

	private PreparedStops prepareStops(List<CoursePlaceRequestItem> rawItems) {
		List<CoursePlaceRequestItem> sortedItems = rawItems.stream()
				.sorted(Comparator.comparingInt(CoursePlaceRequestItem::visitOrder))
				.toList();

		Set<Long> placeIds = sortedItems.stream()
				.map(CoursePlaceRequestItem::placeId)
				.collect(Collectors.toSet());

		Map<Long, Place> placeMap = placeRepository.findAllById(placeIds).stream()
				.collect(Collectors.toMap(Place::getId, Function.identity()));

		for (CoursePlaceRequestItem item : sortedItems) {
			if (!placeMap.containsKey(item.placeId())) {
				throw new BusinessException(
						ErrorCode.NOT_FOUND,
						"존재하지 않는 장소 ID가 포함되어 있습니다: " + item.placeId()
				);
			}
		}

		List<CoursePlace> builtPlaces = new ArrayList<>(sortedItems.size());
		int totalCost = 0;
		int totalMinutes = 0;

		for (int i = 0; i < sortedItems.size(); i++) {
			CoursePlaceRequestItem reqItem = sortedItems.get(i);
			Place currentPlace = placeMap.get(reqItem.placeId());
			boolean isLast = (i == sortedItems.size() - 1);

			int cost = Math.max(0, reqItem.estimatedCost());
			int stay = Math.max(0, reqItem.stayMinutes());
			int travel = 0;

			if (!isLast) {
				Place nextPlace = placeMap.get(sortedItems.get(i + 1).placeId());
				if (reqItem.travelMinutesToNext() != null && reqItem.travelMinutesToNext() > 0) {
					travel = reqItem.travelMinutesToNext();
				}
				else {
					travel = estimateWalkingMinutes(currentPlace, nextPlace);
				}
			}

			totalCost += cost;
			totalMinutes += stay + travel;

			builtPlaces.add(CoursePlace.builder()
					.place(currentPlace)
					.visitOrder(i + 1)
					.estimatedCost(cost)
					.stayMinutes(stay)
					.travelMinutesToNext(travel)
					.memo(trimOrNull(reqItem.memo()))
					.build());
		}

		return new PreparedStops(builtPlaces, totalCost, totalMinutes);
	}

	private static int estimateWalkingMinutes(Place from, Place to) {
		if (Objects.equals(from.getId(), to.getId())) {
			return 0;
		}
		return estimateWalkingMinutesFromCoords(
				from.getLatitude(),
				from.getLongitude(),
				to.getLatitude(),
				to.getLongitude()
		);
	}

	private static int estimateWalkingMinutesFromCoords(double lat1Deg, double lon1Deg, double lat2Deg, double lon2Deg) {
		double dLat = Math.toRadians(lat2Deg - lat1Deg);
		double dLon = Math.toRadians(lon2Deg - lon1Deg);
		double lat1 = Math.toRadians(lat1Deg);
		double lat2 = Math.toRadians(lat2Deg);

		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		double straightMeters = EARTH_RADIUS_METERS * c;
		if (straightMeters < 15.0) {
			return 1;
		}
		return (int) Math.max(1L, Math.round((straightMeters * URBAN_DETOUR_FACTOR) / WALKING_METERS_PER_MINUTE));
	}

	private static List<String> extractThemeLabels(List<DateTheme> themes) {
		if (themes == null) {
			return List.of();
		}
		return themes.stream()
				.filter(Objects::nonNull)
				.map(DateTheme::getLabel)
				.distinct()
				.toList();
	}

	private static String generateShareToken() {
		return UUID.randomUUID().toString().replace("-", "");
	}

	private static String trimOrNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private record PreparedStops(
			List<CoursePlace> coursePlaces,
			int totalEstimatedCost,
			int totalDurationMinutes
	) {
	}
}
