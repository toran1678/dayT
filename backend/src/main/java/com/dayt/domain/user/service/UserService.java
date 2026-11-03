package com.dayt.domain.user.service;

import com.dayt.domain.user.dto.UserSummaryResponse;
import com.dayt.domain.user.dto.UserUpdateRequest;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

	private final UserRepository userRepository;

	public UserSummaryResponse getMyProfile(Long userId) {
		User user = getActiveUser(userId);
		return UserSummaryResponse.from(user);
	}

	@Transactional
	public UserSummaryResponse updateMyProfile(Long userId, UserUpdateRequest request) {
		User user = getActiveUser(userId);
		String normalizedProfileUrl = (request.profileImageUrl() != null && request.profileImageUrl().isBlank())
				? null
				: request.profileImageUrl();

		user.updateProfile(request.nickname().trim(), normalizedProfileUrl);
		return UserSummaryResponse.from(user);
	}

	private User getActiveUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "유효한 사용자 정보를 찾을 수 없습니다."));
	}
}

