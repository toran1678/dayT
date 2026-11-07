package com.dayt.domain.pet.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.dayt.domain.pet.dto.CouplePetResponse;
import com.dayt.domain.pet.dto.DailyMissionItemResponse;
import com.dayt.domain.pet.entity.CoupleMissionLog;
import com.dayt.domain.pet.entity.CouplePet;
import com.dayt.domain.pet.entity.DailyMission;
import com.dayt.domain.pet.repository.CoupleMissionLogRepository;
import com.dayt.domain.pet.repository.CouplePetRepository;
import com.dayt.domain.pet.repository.DailyMissionRepository;
import com.dayt.domain.user.entity.User;
import com.dayt.domain.user.repository.UserRepository;
import com.dayt.global.error.BusinessException;
import com.dayt.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PetMissionService {

	private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");
	private static final int DAILY_CHECK_IN_EXP = 20;
	private static final int DAILY_MISSION_COUNT = 3;

	private final CouplePetRepository couplePetRepository;
	private final DailyMissionRepository dailyMissionRepository;
	private final CoupleMissionLogRepository coupleMissionLogRepository;
	private final UserRepository userRepository;

	@Transactional
	public CouplePetResponse getMyPet(Long userId) {
		User user = getRequiredUser(userId);
		if (user.getCoupleId() == null) {
			throw new BusinessException(ErrorCode.NOT_FOUND, "아직 커플 스페이스가 생성되지 않았습니다. 먼저 초대 코드를 발급하거나 연결해주세요.");
		}
		CouplePet pet = getOrCreatePet(user.getCoupleId());
		return CouplePetResponse.from(pet);
	}

	@Transactional
	public CouplePetResponse checkInToday(Long userId) {
		User user = getRequiredUser(userId);
		if (user.getCoupleId() == null) {
			throw new BusinessException(ErrorCode.NOT_FOUND, "커플 연결 후 만남 인증을 이용할 수 있습니다.");
		}

		CouplePet pet = getOrCreatePet(user.getCoupleId());
		LocalDate today = LocalDate.now(SEOUL_ZONE);

		if (today.equals(pet.getLastMetDate())) {
			throw new BusinessException(ErrorCode.CONFLICT, "오늘 이미 만남 인증을 완료했습니다.");
		}

		pet.checkIn(today, DAILY_CHECK_IN_EXP);
		return CouplePetResponse.from(pet);
	}

	@Transactional
	public List<DailyMissionItemResponse> getTodayMissions(Long userId) {
		User user = getRequiredUser(userId);
		if (user.getCoupleId() == null) {
			return List.of();
		}

		LocalDate today = LocalDate.now(SEOUL_ZONE);
		List<CoupleMissionLog> existing = coupleMissionLogRepository
				.findAllWithMissionByCoupleIdAndAssignedDate(user.getCoupleId(), today);

		if (!existing.isEmpty()) {
			return existing.stream()
					.map(DailyMissionItemResponse::from)
					.toList();
		}

		List<DailyMission> activeMissions = ensureDefaultMissions();
		int total = activeMissions.size();
		int assignCount = Math.min(DAILY_MISSION_COUNT, total);
		int offset = Math.floorMod(today.getDayOfYear() + user.getCoupleId().intValue(), Math.max(1, total));

		List<CoupleMissionLog> toAssign = new ArrayList<>(assignCount);
		for (int i = 0; i < assignCount; i++) {
			DailyMission mission = activeMissions.get((offset + i) % total);
			toAssign.add(CoupleMissionLog.builder()
					.coupleId(user.getCoupleId())
					.mission(mission)
					.assignedDate(today)
					.isCompleted(false)
					.build());
		}

		coupleMissionLogRepository.saveAllAndFlush(toAssign);
		return coupleMissionLogRepository
				.findAllWithMissionByCoupleIdAndAssignedDate(user.getCoupleId(), today)
				.stream()
				.map(DailyMissionItemResponse::from)
				.toList();
	}

	@Transactional
	public DailyMissionItemResponse completeMission(Long userId, Long missionLogId) {
		User user = getRequiredUser(userId);
		if (user.getCoupleId() == null) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "커플 연결 후 미션을 완료할 수 있습니다.");
		}

		CoupleMissionLog log = coupleMissionLogRepository.findWithMissionById(missionLogId)
				.orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "해당 일일 미션을 찾을 수 없습니다."));

		if (!Objects.equals(log.getCoupleId(), user.getCoupleId())) {
			throw new BusinessException(ErrorCode.FORBIDDEN, "해당 미션에 접근할 권한이 없습니다.");
		}

		boolean newlyCompleted = log.markCompleted(Instant.now());
		if (newlyCompleted) {
			CouplePet pet = getOrCreatePet(user.getCoupleId());
			pet.gainExp(log.getMission().getRewardExp());
		}

		return DailyMissionItemResponse.from(log);
	}

	private CouplePet getOrCreatePet(Long coupleId) {
		return couplePetRepository.findByCoupleId(coupleId)
				.orElseGet(() -> couplePetRepository.save(CouplePet.createInitial(coupleId)));
	}

	private List<DailyMission> ensureDefaultMissions() {
		List<DailyMission> current = dailyMissionRepository.findAllByIsActiveTrueOrderByIdAsc();
		if (!current.isEmpty()) {
			return current;
		}
		List<DailyMission> defaults = List.of(
				DailyMission.builder()
						.title("오늘 마신 음료 두 잔 나란히 사진 남기기")
						.description("카페나 식당에서 함께 주문한 메뉴를 나란히 찍어 추억을 남겨보세요.")
						.rewardExp(15)
						.isActive(true)
						.build(),
				DailyMission.builder()
						.title("함께 짠 데이트 코스 첫 경유지 방문하기")
						.description("코스 보관함에 저장한 데이트 루트의 첫 번째 스팟에 도착해 인증해보세요.")
						.rewardExp(20)
						.isActive(true)
						.build(),
				DailyMission.builder()
						.title("집으로 돌아가는 길에 세 줄 데이트 일기 남기기")
						.description("오늘 가장 기억에 남는 순간을 일기장에 짧게 기록해보세요.")
						.rewardExp(25)
						.isActive(true)
						.build()
		);
		return dailyMissionRepository.saveAllAndFlush(defaults);
	}

	private User getRequiredUser(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
	}
}

