package com.dayt.domain.couple.service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import com.dayt.domain.couple.dto.CoupleConnectRequest;
import com.dayt.domain.couple.dto.CoupleInviteResponse;
import com.dayt.domain.couple.dto.CoupleSummaryResponse;
import com.dayt.domain.couple.entity.Couple;
import com.dayt.domain.couple.entity.CoupleStatus;
import com.dayt.domain.couple.repository.CoupleRepository;
import com.dayt.domain.pet.entity.CouplePet;
import com.dayt.domain.pet.repository.CouplePetRepository;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoupleService {

	private static final String INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	private static final int INVITE_CODE_LENGTH = 6;
	private static final SecureRandom RANDOM = new SecureRandom();

	private final CoupleRepository coupleRepository;
	private final CouplePetRepository couplePetRepository;
	private final UserRepository userRepository;

	@Transactional
	public CoupleInviteResponse createOrGetInvite(Long userId) {
		User user = getRequiredUser(userId);

		if (user.getCoupleId() != null) {
			Couple existing = coupleRepository.findById(user.getCoupleId()).orElse(null);
			if (existing != null) {
				ensurePetExists(existing.getId());
				return CoupleInviteResponse.from(existing);
			}
		}

		String inviteCode = generateUniqueInviteCode();
		Couple created = coupleRepository.save(
				Couple.builder()
						.inviteCode(inviteCode)
						.status(CoupleStatus.PENDING)
						.build()
		);
		user.linkCouple(created.getId());
		ensurePetExists(created.getId());

		return CoupleInviteResponse.from(created);
	}

	@Transactional
	public CoupleSummaryResponse connectCouple(Long userId, CoupleConnectRequest request) {
		User caller = getRequiredUser(userId);
		String normalizedCode = request.inviteCode().trim().toUpperCase(Locale.ROOT);

		Couple targetCouple = coupleRepository.findByInviteCode(normalizedCode)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "유효한 초대 코드를 찾을 수 없습니다."));

		List<User> targetMembers = userRepository.findAllByCoupleId(targetCouple.getId());

		boolean callerAlreadyInTarget = targetMembers.stream()
				.anyMatch(member -> Objects.equals(member.getId(), caller.getId()));

		if (callerAlreadyInTarget && targetMembers.size() == 1) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "본인의 초대 코드로는 연결할 수 없습니다.");
		}

		long otherMemberCount = targetMembers.stream()
				.filter(member -> !Objects.equals(member.getId(), caller.getId()))
				.count();
		if (otherMemberCount >= 2) {
			throw new BusinessException(ErrorCode.INVALID_INPUT, "이미 두 명의 연인이 연결된 초대 코드입니다.");
		}

		if (caller.getCoupleId() != null && !Objects.equals(caller.getCoupleId(), targetCouple.getId())) {
			Couple previousCouple = coupleRepository.findById(caller.getCoupleId()).orElse(null);
			if (previousCouple != null && previousCouple.getStatus() == CoupleStatus.CONNECTED) {
				long prevMembers = userRepository.findAllByCoupleId(previousCouple.getId()).size();
				if (prevMembers >= 2) {
					throw new BusinessException(ErrorCode.INVALID_INPUT, "이미 다른 연인과 커플로 연결되어 있습니다.");
				}
			}
		}

		caller.linkCouple(targetCouple.getId());
		targetCouple.connect(request.startedDate());
		userRepository.flush();

		CouplePet pet = ensurePetExists(targetCouple.getId());
		if (pet.getExp() == 0 && pet.getLevel() == 1 && pet.getTotalMeetDays() == 0) {
			pet.gainExp(20);
		}

		String partnerNickname = userRepository.findAllByCoupleId(targetCouple.getId()).stream()
				.filter(member -> !Objects.equals(member.getId(), caller.getId()))
				.map(User::getNickname)
				.findFirst()
				.orElse(null);

		return CoupleSummaryResponse.of(targetCouple, partnerNickname);
	}

	private CouplePet ensurePetExists(Long coupleId) {
		return couplePetRepository.findByCoupleId(coupleId)
				.orElseGet(() -> couplePetRepository.save(CouplePet.createInitial(coupleId)));
	}

	private String generateUniqueInviteCode() {
		for (int attempt = 0; attempt < 20; attempt++) {
			StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
			for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
				sb.append(INVITE_ALPHABET.charAt(RANDOM.nextInt(INVITE_ALPHABET.length())));
			}
			String candidate = sb.toString();
			if (!coupleRepository.existsByInviteCode(candidate)) {
				return candidate;
			}
		}
		throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "초대 코드 생성에 실패했습니다.");
	}

	private User getRequiredUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
	}
}

