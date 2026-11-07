package com.dayt.domain.course.collab;

import java.security.Principal;
import java.util.List;

import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketCollabConfig implements WebSocketMessageBrokerConfigurer {

	private final JwtDecoder jwtDecoder;

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.addEndpoint("/ws/collab")
				.setAllowedOriginPatterns("*");
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		registry.enableSimpleBroker("/topic");
		registry.setApplicationDestinationPrefixes("/app");
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(new ChannelInterceptor() {
			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {
				StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
				if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
					String authHeader = extractAuthorizationHeader(accessor);
					if (authHeader == null || !authHeader.startsWith("Bearer ")) {
						throw new BusinessException(ErrorCode.UNAUTHORIZED, "WebSocket 연결에 유효한 Bearer 토큰이 필요합니다.");
					}
					String rawToken = authHeader.substring(7).trim();
					try {
						Jwt jwt = jwtDecoder.decode(rawToken);
						long userId = Long.parseLong(jwt.getSubject());
						accessor.setUser(new CollabPrincipal(userId));
					}
					catch (JwtException | NumberFormatException ex) {
						throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 WebSocket 인증 토큰입니다.");
					}
				}
				return message;
			}
		});
	}

	private static String extractAuthorizationHeader(StompHeaderAccessor accessor) {
		List<String> headers = accessor.getNativeHeader("Authorization");
		if (headers != null && !headers.isEmpty()) {
			return headers.getFirst();
		}
		List<String> lower = accessor.getNativeHeader("authorization");
		if (lower != null && !lower.isEmpty()) {
			return lower.getFirst();
		}
		return null;
	}

	public record CollabPrincipal(long userId) implements Principal {
		@Override
		public String getName() {
			return Long.toString(userId);
		}
	}
}

