package com.dayt.domain.ai.client;

import java.util.Optional;

import com.dayt.domain.ai.dto.InternalAiCourseGenerateRequest;
import com.dayt.domain.ai.dto.InternalPlaceEnrichRequest;
import com.dayt.domain.ai.dto.InternalPlaceEnrichResponse;
import com.dayt.domain.course.dto.CourseRecommendationPreviewResponse;

public interface AiServiceClient {

	Optional<CourseRecommendationPreviewResponse> generateCourse(InternalAiCourseGenerateRequest request);

	Optional<InternalPlaceEnrichResponse> enrichPlace(InternalPlaceEnrichRequest request);
}

