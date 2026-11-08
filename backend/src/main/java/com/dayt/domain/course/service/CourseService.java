package com.dayt.domain.course.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
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
import com.dayt.domain.course.collab.CollabBroadcastEvent;
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
import com.dayt.domain.place.entity.FoodCategory;
import com.dayt.domain.place.entity.Place;
import com.dayt.domain.place.entity.PlaceCategoryGroup;
import com.dayt.domain.place.repository.PlaceRepository;
import com.dayt.domain.place.service.PlaceService;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
	private final ObjectProvider<SimpMessagingTemplate> messagingTemplateProvider;

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
		List<PlaceDetailResponse> candidates = new ArrayList<>();
		Set<Long> seenCandidateIds = new HashSet<>();

		// 1. 사용자가 특정 음식 카테고리를 선택한 경우, 해당 카테고리의 실존 식당들을 최우선 수집하여 AI 후보군에 주입
		if (request.foodCategories() != null && !request.foodCategories().isEmpty()) {
			for (FoodCategory fc : request.foodCategories()) {
				List<PlaceDetailResponse> matchedRestaurants = placeService.searchPlaces(
						request.regionKeyword().trim(),
						request.latitude(),
						request.longitude(),
						3500,
						PlaceCategoryGroup.RESTAURANT,
						fc,
						null,
						rainyFilter,
						0,
						10
				).items();
				for (PlaceDetailResponse r : matchedRestaurants) {
					if (seenCandidateIds.add(r.id())) {
						candidates.add(r);
					}
				}
			}
		}

		// 2. 주변 일반 장소(카페, 문화, 산책, 기타 스팟) 보강
		List<PlaceDetailResponse> generalPlaces = placeService.searchPlaces(
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
		for (PlaceDetailResponse p : generalPlaces) {
			if (seenCandidateIds.add(p.id())) {
				candidates.add(p);
			}
		}

		if (candidates.size() < 2) {
			List<PlaceDetailResponse> widePlaces = placeService.searchPlaces(
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
			for (PlaceDetailResponse p : widePlaces) {
				if (seenCandidateIds.add(p.id())) {
					candidates.add(p);
				}
			}
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
		CourseDetailResponse saved = applyCourseUpdate(userId, courseId, request);
		User editor = getRequiredUser(userId);
		broadcastCourseChange("SYNC_COURSE", courseId, editor, saved);
		return saved;
	}

	@Transactional
	public CourseDetailResponse updateCourseFromCollab(Long userId, Long courseId, CourseUpsertRequest request) {
		return applyCourseUpdate(userId, courseId, request);
	}

	private CourseDetailResponse applyCourseUpdate(Long userId, Long courseId, CourseUpsertRequest request) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findWithPlacesById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "수정할 코스를 찾을 수 없습니다."));

		if (!canModifyCourse(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스를 수정할 권한이 없습니다.");
		}

		PreparedStops prepared = prepareStops(request.places());
		Long nextCoupleId = Boolean.TRUE.equals(request.shareWithCouple())
				? (user.getCoupleId() != null ? user.getCoupleId() : course.getCoupleId())
				: course.getCoupleId();

		if (!Boolean.TRUE.equals(request.shareWithCouple()) && isOwnerOrPartner(course, user)) {
			nextCoupleId = null;
		}

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
	public CourseDetailResponse updateCollaboration(Long userId, Long courseId, boolean isCollabOpen) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findWithPlacesById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "코스를 찾을 수 없습니다."));

		if (!isOwnerOrPartner(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "공동 편집 설정을 변경할 권한이 없습니다.");
		}

		course.updateCollaboration(isCollabOpen);
		if (isCollabOpen && user.getCoupleId() != null) {
			course.linkCoupleIfAbsent(user.getCoupleId());
		}

		Course saved = courseRepository.saveAndFlush(course);
		CourseDetailResponse detail = CourseDetailResponse.from(saved);
		broadcastCourseChange("COLLAB_STATUS", courseId, user, detail);
		return detail;
	}

	@Transactional(readOnly = true)
	public byte[] exportCourseKml(Long userId, Long courseId) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findWithPlacesById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "코스를 찾을 수 없습니다."));

		if (!canViewCourse(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스의 KML 파일을 내보낼 권한이 없습니다.");
		}

		List<CoursePlace> sorted = course.getCoursePlaces().stream()
				.sorted(Comparator.comparingInt(CoursePlace::getVisitOrder))
				.toList();

		StringBuilder xml = new StringBuilder(2048);
		xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		xml.append("<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n");
		xml.append("  <Document>\n");
		xml.append("    <name>").append(escapeXml(course.getTitle())).append("</name>\n");

		String docDesc = (course.getDescription() != null && !course.getDescription().isBlank()
				? course.getDescription() + " | "
				: "")
				+ "총 예상 비용: " + String.format("%,d원", course.getTotalEstimatedCost())
				+ " · 총 소요 시간: " + course.getTotalDurationMinutes() + "분";
		xml.append("    <description>").append(escapeXml(docDesc)).append("</description>\n");

		xml.append("    <Style id=\"daytRouteStyle\">\n");
		xml.append("      <LineStyle>\n");
		xml.append("        <color>ff3f5de8</color>\n");
		xml.append("        <width>5</width>\n");
		xml.append("      </LineStyle>\n");
		xml.append("    </Style>\n");

		for (CoursePlace cp : sorted) {
			Place place = cp.getPlace();
			String placemarkName = cp.getVisitOrder() + ". " + place.getName();
			StringBuilder placeDesc = new StringBuilder()
					.append(place.getAddress())
					.append(" · 체류 ").append(cp.getStayMinutes()).append("분")
					.append(" · 2인 ").append(String.format("%,d원", cp.getEstimatedCost()));
			if (cp.getMemo() != null && !cp.getMemo().isBlank()) {
				placeDesc.append(" | 메모: ").append(cp.getMemo());
			}

			xml.append("    <Placemark>\n");
			xml.append("      <name>").append(escapeXml(placemarkName)).append("</name>\n");
			xml.append("      <description>").append(escapeXml(placeDesc.toString())).append("</description>\n");
			xml.append("      <Point>\n");
			xml.append("        <coordinates>")
					.append(place.getLongitude()).append(",")
					.append(place.getLatitude()).append(",0</coordinates>\n");
			xml.append("      </Point>\n");
			xml.append("    </Placemark>\n");
		}

		if (sorted.size() >= 2) {
			String coordLine = sorted.stream()
					.map(cp -> cp.getPlace().getLongitude() + "," + cp.getPlace().getLatitude() + ",0")
					.collect(Collectors.joining(" "));

			xml.append("    <Placemark>\n");
			xml.append("      <name>").append(escapeXml(course.getTitle() + " 이동 동선")).append("</name>\n");
			xml.append("      <styleUrl>#daytRouteStyle</styleUrl>\n");
			xml.append("      <LineString>\n");
			xml.append("        <tessellate>1</tessellate>\n");
			xml.append("        <coordinates>").append(coordLine).append("</coordinates>\n");
			xml.append("      </LineString>\n");
			xml.append("    </Placemark>\n");
		}

		xml.append("  </Document>\n");
		xml.append("</kml>\n");
		return xml.toString().getBytes(StandardCharsets.UTF_8);
	}

	@Transactional
	public void deleteCourse(Long userId, Long courseId) {
		User user = getRequiredUser(userId);
		Course course = courseRepository.findById(courseId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "삭제할 코스를 찾을 수 없습니다."));

		if (!isOwnerOrPartner(course, user)) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 코스를 삭제할 권한이 없습니다.");
		}
		courseRepository.delete(course);
	}

	private void broadcastCourseChange(
			String action,
			Long courseId,
			User editor,
			CourseDetailResponse detail
	) {
		SimpMessagingTemplate template = messagingTemplateProvider.getIfAvailable();
		if (template == null) {
			return;
		}
		CollabBroadcastEvent event = new CollabBroadcastEvent(
				action,
				courseId,
				editor.getId(),
				editor.getNickname(),
				null,
				detail,
				Instant.now()
		);
		template.convertAndSend("/topic/courses/" + courseId, event);
	}

	private static String escapeXml(String input) {
		if (input == null) {
			return "";
		}
		return input
				.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;")
				.replace("'", "&apos;");
	}

	private CourseRecommendationPreviewResponse buildBackendFallbackPreview(
			CourseRecommendRequest req,
			List<PlaceDetailResponse> candidates
	) {
		int desiredCount = (req.timeSlot() == DateTimeSlot.ALL_DAY)
				? (candidates.size() >= 5 ? 5 : 4)
				: (req.timeSlot() == DateTimeSlot.HALF_DAY ? 3 : (candidates.size() >= 3 ? 3 : 2));
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
			int stay;
			if (req.timeSlot() == DateTimeSlot.ALL_DAY) {
				stay = (p.categoryGroup() == PlaceCategoryGroup.RESTAURANT) ? 90
						: (p.categoryGroup() == PlaceCategoryGroup.CAFE ? 75 : 105);
			} else if (req.timeSlot() == DateTimeSlot.EVENING) {
				stay = (p.categoryGroup() == PlaceCategoryGroup.RESTAURANT) ? 80 : 70;
			} else {
				stay = (p.categoryGroup() == PlaceCategoryGroup.RESTAURANT) ? 70
						: (p.categoryGroup() == PlaceCategoryGroup.CAFE ? 60 : 85);
			}
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

		int minTarget = (req.timeSlot() == DateTimeSlot.ALL_DAY) ? 360
				: (req.timeSlot() == DateTimeSlot.HALF_DAY ? 180 : 120);
		if (totalMinutes < minTarget && !items.isEmpty()) {
			int deficit = minTarget - totalMinutes;
			int addPerStop = (int) Math.ceil((double) deficit / items.size());
			totalMinutes = 0;
			List<CoursePlaceDetailItem> adjustedItems = new ArrayList<>(items.size());
			for (CoursePlaceDetailItem it : items) {
				int adjustedStay = it.stayMinutes() + addPerStop;
				adjustedItems.add(new CoursePlaceDetailItem(
						it.visitOrder(),
						it.estimatedCost(),
						adjustedStay,
						it.travelMinutesToNext(),
						it.memo(),
						it.place()
				));
				totalMinutes += adjustedStay + it.travelMinutesToNext();
			}
			items = adjustedItems;
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

	private static boolean isOwnerOrPartner(Course course, User user) {
		if (Objects.equals(course.getCreatorId(), user.getId())) {
			return true;
		}
		return course.getCoupleId() != null && Objects.equals(course.getCoupleId(), user.getCoupleId());
	}

	private static boolean canViewCourse(Course course, User user) {
		if (isOwnerOrPartner(course, user)) {
			return true;
		}
		return Boolean.TRUE.equals(course.getIsCollabOpen());
	}

	private static boolean canModifyCourse(Course course, User user) {
		if (isOwnerOrPartner(course, user)) {
			return true;
		}
		return Boolean.TRUE.equals(course.getIsCollabOpen());
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
