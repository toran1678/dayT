package com.dayt.domain.course.collab;

import java.security.Principal;
import java.time.Instant;

import com.dayt.domain.course.dto.CourseDetailResponse;
import com.dayt.domain.course.service.CourseService;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class CourseCollabWsController {

	private final CourseService courseService;
	private final UserRepository userRepository;
	private final SimpMessagingTemplate messagingTemplate;

	@MessageMapping("/courses/{courseId}/edit")
	public void handleCourseCollabMessage(
			@DestinationVariable Long courseId,
			@Payload CollabEditMessage payload,
			Principal principal
	) {
		long userId = extractUserId(principal);
		User editor = userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

		String action = payload != null && payload.action() != null ? payload.action() : "SYNC_COURSE";
		String sessionId = payload != null ? payload.clientSessionId() : null;

		CourseDetailResponse snapshot;
		if ("SYNC_COURSE".equalsIgnoreCase(action) && payload != null && payload.course() != null) {
			snapshot = courseService.updateCourseFromCollab(userId, courseId, payload.course());
		}
		else {
			snapshot = courseService.getCourseDetail(userId, courseId);
		}

		CollabBroadcastEvent event = new CollabBroadcastEvent(
				action.toUpperCase(),
				courseId,
				editor.getId(),
				editor.getNickname(),
				sessionId,
				snapshot,
				Instant.now()
		);
		messagingTemplate.convertAndSend("/topic/courses/" + courseId, event);
	}

	private static long extractUserId(Principal principal) {
		if (principal == null || principal.getName() == null) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED);
		}
		try {
			return Long.parseLong(principal.getName());
		}
		catch (NumberFormatException ex) {
			throw new BusinessException(ErrorCode.UNAUTHORIZED);
		}
	}
}

