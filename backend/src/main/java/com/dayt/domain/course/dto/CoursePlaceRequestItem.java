package com.dayt.domain.course.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CoursePlaceRequestItem(
		@NotNull(message = "장소 ID는 필수입니다.")
		Long placeId,

		@NotNull(message = "방문 순서는 필수입니다.")
		@Min(value = 1, message = "방문 순서는 1 이상이어야 합니다.")
		Integer visitOrder,

		@NotNull(message = "예상 비용은 필수입니다.")
		@Min(value = 0, message = "예상 비용은 0원 이상이어야 합니다.")
		Integer estimatedCost,

		@NotNull(message = "체류 시간은 필수입니다.")
		@Min(value = 0, message = "체류 시간은 0분 이상이어야 합니다.")
		Integer stayMinutes,

		@NotNull(message = "이동 시간은 필수입니다.")
		@Min(value = 0, message = "이동 시간은 0분 이상이어야 합니다.")
		Integer travelMinutesToNext,

		@Size(max = 255, message = "메모는 255자 이내로 입력해주세요.")
		String memo
) {
}

