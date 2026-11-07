package com.dayt.domain.course;

import java.lang.reflect.Type;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import com.dayt.domain.course.collab.CollabBroadcastEvent;
import com.dayt.domain.course.collab.CollabEditMessage;
import com.dayt.domain.course.dto.CoursePlaceRequestItem;
import com.dayt.domain.course.dto.CourseUpsertRequest;
import com.dayt.domain.course.entity.CourseSourceType;
import com.dayt.domain.course.entity.DateTheme;
import com.dayt.domain.course.entity.DateTimeSlot;
import com.dayt.domain.course.repository.CourseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.client.RestClient;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = {
				"dayt.kakao-local.enabled=false",
				"dayt.ai-service.enabled=false",
				"dayt.google-places.enabled=false"
		}
)
class CourseCollabWebSocketTest {

	@LocalServerPort
	private int port;

	@Autowired
	private CourseRepository courseRepository;

	@Autowired
	private com.dayt.domain.user.repository.UserRepository userRepository;

	private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
	private Long createdCourseId;
	private Long ownerUserId;
	private Long editorUserId;

	@AfterEach
	void cleanUp() {
		if (createdCourseId != null) {
			courseRepository.deleteById(createdCourseId);
		}
		if (ownerUserId != null) {
			userRepository.deleteById(ownerUserId);
		}
		if (editorUserId != null) {
			userRepository.deleteById(editorUserId);
		}
	}

	@Test
	@DisplayName("[F-13] STOMP WebSocket(/ws/collab) 실시간 공동 편집 브로드캐스트 검증")
	void stompCollabRealtimeSyncFlow() throws Exception {
		RestClient restClient = RestClient.builder()
				.baseUrl("http://localhost:" + port)
				.build();

		AuthSession owner = loginDevUser(restClient, "dev:ws_owner_user");
		AuthSession editor = loginDevUser(restClient, "dev:ws_collab_editor");
		ownerUserId = owner.userId();
		editorUserId = editor.userId();
		String ownerToken = owner.accessToken();
		String editorToken = editor.accessToken();

		String placesJson = restClient.get()
				.uri("/api/v1/places/search?keyword=성수역&radiusMeters=2000")
				.retrieve()
				.body(String.class);
		JsonNode items = objectMapper.readTree(placesJson).get("items");
		long p1 = items.get(0).get("id").asLong();
		long p2 = items.get(1).get("id").asLong();

		String createCourseJson = """
				{
				  "title": "공동 편집 테스트 루트",
				  "description": "초기 코스",
				  "themeTags": ["감성 카페"],
				  "timeSlot": "HALF_DAY",
				  "sourceType": "CUSTOM",
				  "shareWithCouple": false,
				  "places": [
				    {
				      "placeId": %d,
				      "visitOrder": 1,
				      "estimatedCost": 20000,
				      "stayMinutes": 60,
				      "travelMinutesToNext": 0,
				      "memo": "1차 카페"
				    }
				  ]
				}
				""".formatted(p1);

		String createdResp = restClient.post()
				.uri("/api/v1/courses")
				.header("Authorization", "Bearer " + ownerToken)
				.contentType(MediaType.APPLICATION_JSON)
				.body(createCourseJson)
				.retrieve()
				.body(String.class);

		createdCourseId = objectMapper.readTree(createdResp).get("id").asLong();

		// 공동 편집 허용 활성화 (PATCH /api/v1/courses/{courseId}/collaboration)
		restClient.patch()
				.uri("/api/v1/courses/" + createdCourseId + "/collaboration")
				.header("Authorization", "Bearer " + ownerToken)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("isCollabOpen", true))
				.retrieve()
				.toBodilessEntity();

		WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
		stompClient.setMessageConverter(new JacksonJsonMessageConverter());

		StompHeaders ownerConnectHeaders = new StompHeaders();
		ownerConnectHeaders.add("Authorization", "Bearer " + ownerToken);

		StompHeaders editorConnectHeaders = new StompHeaders();
		editorConnectHeaders.add("Authorization", "Bearer " + editorToken);

		URI wsUri = URI.create("ws://localhost:" + port + "/ws/collab");
		StompSession ownerSession = stompClient
				.connectAsync(wsUri, new WebSocketHttpHeaders(), ownerConnectHeaders, new StompSessionHandlerAdapter() {})
				.get(5, TimeUnit.SECONDS);

		StompSession editorSession = stompClient
				.connectAsync(wsUri, new WebSocketHttpHeaders(), editorConnectHeaders, new StompSessionHandlerAdapter() {})
				.get(5, TimeUnit.SECONDS);

		try {
			BlockingQueue<CollabBroadcastEvent> receivedEvents = new LinkedBlockingQueue<>();
			ownerSession.subscribe("/topic/courses/" + createdCourseId, new StompFrameHandler() {
				@Override
				public Type getPayloadType(StompHeaders headers) {
					return CollabBroadcastEvent.class;
				}

				@Override
				public void handleFrame(StompHeaders headers, Object payload) {
					if (payload instanceof CollabBroadcastEvent event) {
						receivedEvents.offer(event);
					}
				}
			});

			// 구독 프레임이 브로커에 등록될 짧은 여유 확보 후 공동편집자가 실시간 수정 전송
			Thread.sleep(150);

			CourseUpsertRequest liveUpdate = new CourseUpsertRequest(
					"실시간으로 함께 수정한 성수 데이트 코스",
					"2번째 스팟 추가 완료",
					List.of(DateTheme.CAFE, DateTheme.FOOD_TOUR),
					DateTimeSlot.EVENING,
					CourseSourceType.CUSTOM,
					false,
					List.of(
							new CoursePlaceRequestItem(p1, 1, 22000, 60, 8, "창가 좌석"),
							new CoursePlaceRequestItem(p2, 2, 38000, 80, 0, "저녁 메인 식사")
					)
			);

			editorSession.send(
					"/app/courses/" + createdCourseId + "/edit",
					new CollabEditMessage("SYNC_COURSE", "tab-editor-1", liveUpdate)
			);

			CollabBroadcastEvent broadcast = receivedEvents.poll(5, TimeUnit.SECONDS);
			assertThat(broadcast).isNotNull();
			assertThat(broadcast.action()).isEqualTo("SYNC_COURSE");
			assertThat(broadcast.editorNickname()).isEqualTo(editor.nickname());
			assertThat(broadcast.clientSessionId()).isEqualTo("tab-editor-1");
			assertThat(broadcast.course().title()).isEqualTo("실시간으로 함께 수정한 성수 데이트 코스");
			assertThat(broadcast.course().places()).hasSize(2);
			assertThat(broadcast.course().totalEstimatedCost()).isEqualTo(60000);
		}
		finally {
			ownerSession.disconnect();
			editorSession.disconnect();
			stompClient.stop();
		}
	}

	private AuthSession loginDevUser(RestClient restClient, String devAuthCode) throws Exception {
		String resp = restClient.post()
				.uri("/api/v1/auth/oauth/KAKAO")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("authorizationCode", devAuthCode))
				.retrieve()
				.body(String.class);
		JsonNode json = objectMapper.readTree(resp.getBytes(StandardCharsets.UTF_8));
		return new AuthSession(
				json.get("user").get("id").asLong(),
				json.get("accessToken").asText(),
				json.get("user").get("nickname").asText()
		);
	}

	private record AuthSession(long userId, String accessToken, String nickname) {
	}
}
