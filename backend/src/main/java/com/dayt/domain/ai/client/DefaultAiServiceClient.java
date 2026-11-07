package com.dayt.domain.ai.client;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Optional;

import com.dayt.domain.ai.dto.InternalAiCourseGenerateRequest;
import com.dayt.domain.ai.dto.InternalPlaceEnrichRequest;
import com.dayt.domain.ai.dto.InternalPlaceEnrichResponse;
import com.dayt.domain.course.dto.CourseRecommendationPreviewResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class DefaultAiServiceClient implements AiServiceClient {

	private final RestClient restClient;
	private final boolean enabled;

	public DefaultAiServiceClient(
			@Value("${dayt.ai-service.base-url:http://localhost:8000}") String baseUrl,
			@Value("${dayt.ai-service.enabled:true}") boolean enabled
	) {
		this.enabled = enabled;

		HttpClient httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(3))
				.build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(20));

		this.restClient = RestClient.builder()
				.baseUrl(baseUrl)
				.requestFactory(requestFactory)
				.build();
	}

	@Override
	public Optional<CourseRecommendationPreviewResponse> generateCourse(InternalAiCourseGenerateRequest request) {
		if (!enabled) {
			return Optional.empty();
		}
		try {
			CourseRecommendationPreviewResponse response = restClient.post()
					.uri("/internal/ai/v1/courses/generate")
					.contentType(MediaType.APPLICATION_JSON)
					.body(request)
					.retrieve()
					.body(CourseRecommendationPreviewResponse.class);
			return Optional.ofNullable(response);
		}
		catch (RestClientException ex) {
			log.warn("AI service course generation call failed ({}); falling back to backend spatial optimizer.", ex.getMessage());
			return Optional.empty();
		}
	}

	@Override
	public Optional<InternalPlaceEnrichResponse> enrichPlace(InternalPlaceEnrichRequest request) {
		if (!enabled) {
			return Optional.empty();
		}
		try {
			InternalPlaceEnrichResponse response = restClient.post()
					.uri("/internal/ai/v1/places/enrich")
					.contentType(MediaType.APPLICATION_JSON)
					.body(request)
					.retrieve()
					.body(InternalPlaceEnrichResponse.class);
			return Optional.ofNullable(response);
		}
		catch (RestClientException ex) {
			log.debug("AI service place enrich skipped for placeId={}: {}", request.placeId(), ex.getMessage());
			return Optional.empty();
		}
	}
}

