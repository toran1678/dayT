"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Flame,
  HeartHandshake,
  Loader2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import type {
  CoupleInviteResponse,
  CouplePetResponse,
  CoupleSummary,
  DailyMissionItem,
} from "@/shared/api/types";
import {
  checkInPetTodayApi,
  completeDailyMissionApi,
  connectCoupleApi,
  createOrGetCoupleInviteApi,
  dispatchPetUpdated,
  fetchMyPetApi,
  fetchTodayMissionsApi,
} from "./together-api";

function getPetStageMeta(characterType?: string) {
  switch (characterType) {
    case "LOVEBIRD":
      return {
        emoji: "🐥",
        quote: "“함께 걸은 길만큼 우리도 부쩍 자랐어요!”",
        stageLabel: "설렘 앵무",
      };
    case "SWAN":
      return {
        emoji: "🦢",
        quote: "“어느 동네를 가도 이제 호흡이 척척 맞네요!”",
        stageLabel: "로맨틱 백조",
      };
    case "PHOENIX":
      return {
        emoji: "🔥",
        quote: "“전설의 커플! 앞으로의 모든 계절도 함께해요.”",
        stageLabel: "전설의 불사조",
      };
    default:
      return {
        emoji: "🐣",
        quote: "“이번 주말엔 어디로 데이트 가나요?”",
        stageLabel: "아기 삐약이",
      };
  }
}

function getTodaySeoulIso(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function TogetherClientView() {
  const {
    user,
    isInitializing,
    openLoginModal,
    refreshProfile,
    authenticatedFetch,
  } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<CoupleInviteResponse | null>(
    null,
  );
  const [connectedSummary, setConnectedSummary] =
    useState<CoupleSummary | null>(null);
  const [pet, setPet] = useState<CouplePetResponse | null>(null);
  const [missions, setMissions] = useState<DailyMissionItem[]>([]);
  const [todayIso, setTodayIso] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [startedDateInput, setStartedDateInput] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [completingMissionId, setCompletingMissionId] = useState<number | null>(
    null,
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isInitializing || !user) {
      return;
    }
    let active = true;
    async function loadSpace() {
      try {
        const invite = await createOrGetCoupleInviteApi(authenticatedFetch);
        if (!active) return;
        setInviteInfo(invite);

        if (!user?.coupleId) {
          await refreshProfile();
        }

        const [petData, missionList] = await Promise.all([
          fetchMyPetApi(authenticatedFetch),
          fetchTodayMissionsApi(authenticatedFetch),
        ]);
        if (!active) return;
        setPet(petData);
        setTodayIso(getTodaySeoulIso());
        dispatchPetUpdated(petData);
        setMissions(missionList);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setFeedbackMessage({ type: "error", text: err.message });
        }
      } finally {
        if (active) setHasLoaded(true);
      }
    }
    void loadSpace();
    return () => {
      active = false;
    };
  }, [isInitializing, user, authenticatedFetch, refreshProfile]);

  async function handleGenerateInviteCode() {
    if (!user) {
      openLoginModal();
      return;
    }
    setIsGeneratingCode(true);
    setFeedbackMessage(null);
    try {
      const invite = await createOrGetCoupleInviteApi(authenticatedFetch);
      setInviteInfo(invite);
      await refreshProfile();
      const [petData, missionList] = await Promise.all([
        fetchMyPetApi(authenticatedFetch),
        fetchTodayMissionsApi(authenticatedFetch),
      ]);
      setPet(petData);
      dispatchPetUpdated(petData);
      setMissions(missionList);
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text:
          err instanceof ApiError
            ? err.message
            : "초대 코드를 발급하지 못했습니다.",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  }

  async function handleCopyInviteCode() {
    if (!inviteInfo?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteInfo.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  async function handleConnectPartner() {
    if (!user) {
      openLoginModal();
      return;
    }
    const cleanCode = partnerCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setFeedbackMessage({
        type: "error",
        text: "상대방에게 전달받은 6자리 초대 코드를 입력해주세요.",
      });
      return;
    }

    setIsConnecting(true);
    setFeedbackMessage(null);
    try {
      const summary = await connectCoupleApi(authenticatedFetch, {
        inviteCode: cleanCode,
        startedDate: startedDateInput || null,
      });
      setConnectedSummary(summary);
      setInviteInfo((prev) =>
        prev
          ? { ...prev, coupleId: summary.id, status: summary.status }
          : {
              coupleId: summary.id,
              inviteCode: cleanCode,
              status: summary.status,
            },
      );
      setPartnerCodeInput("");
      await refreshProfile();

      const [petData, missionList] = await Promise.all([
        fetchMyPetApi(authenticatedFetch),
        fetchTodayMissionsApi(authenticatedFetch),
      ]);
      setPet(petData);
      dispatchPetUpdated(petData);
      setMissions(missionList);

      setFeedbackMessage({
        type: "success",
        text: summary.partnerNickname
          ? `${summary.partnerNickname}님과 커플 연결이 완료되었어요! 코스와 일기장이 함께 공유됩니다.`
          : "커플 연결이 완료되었어요!",
      });
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text:
          err instanceof ApiError
            ? err.message
            : "초대 코드 연결 중 오류가 발생했습니다.",
      });
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleCheckInToday() {
    if (!user) {
      openLoginModal();
      return;
    }
    setIsCheckingIn(true);
    setFeedbackMessage(null);
    try {
      const updatedPet = await checkInPetTodayApi(authenticatedFetch);
      setPet(updatedPet);
      setTodayIso(getTodaySeoulIso());
      setFeedbackMessage({
        type: "success",
        text: "오늘의 만남 인증 완료! 커플 펫이 +20 XP 성장했어요 🎉",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFeedbackMessage({
          type: "error",
          text: "오늘은 이미 만남 인증을 완료했어요! 내일 데이트에서 또 인증해보세요.",
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text:
            err instanceof ApiError
              ? err.message
              : "만남 인증 처리 중 오류가 발생했습니다.",
        });
      }
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleCompleteMission(mission: DailyMissionItem) {
    if (!user) {
      openLoginModal();
      return;
    }
    if (mission.isCompleted) return;
    setCompletingMissionId(mission.missionLogId);
    setFeedbackMessage(null);
    try {
      const updatedMission = await completeDailyMissionApi(
        authenticatedFetch,
        mission.missionLogId,
      );
      setMissions((prev) =>
        prev.map((m) =>
          m.missionLogId === updatedMission.missionLogId ? updatedMission : m,
        ),
      );
      const updatedPet = await fetchMyPetApi(authenticatedFetch);
      setPet(updatedPet);
      dispatchPetUpdated(updatedPet);
      setFeedbackMessage({
        type: "success",
        text: `'${mission.title}' 달성! +${mission.rewardExp} XP가 적립되었어요.`,
      });
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text:
          err instanceof ApiError
            ? err.message
            : "미션 완료 처리에 실패했습니다.",
      });
    } finally {
      setCompletingMissionId(null);
    }
  }

  const isAlreadyCheckedInToday =
    todayIso !== null && pet?.lastMetDate === todayIso;
  const stageMeta = getPetStageMeta(pet?.characterType);
  const expPercent = pet
    ? Math.min(100, Math.round((pet.exp / Math.max(1, pet.nextLevelExp)) * 100))
    : 0;
  const remainingExp = pet ? Math.max(0, pet.nextLevelExp - pet.exp) : 100;
  const coupleStatus = connectedSummary?.status ?? inviteInfo?.status ?? "PENDING";

  if (!isInitializing && !user) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs font-bold tracking-widest text-primary">
            COUPLE LOUNGE
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            만날수록 자라나는 우리 둘의 스페이스
          </h1>
          <p className="mt-1 text-sm text-muted">
            로그인 후 6자리 초대 코드로 연인과 연결하면 코스와 펫, 데이트 일기장이 실시간으로 동기화됩니다.
          </p>
        </header>

        <div className="rounded-[28px] border border-line bg-surface p-10 text-center shadow-xs">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-4xl">
            🐣
          </div>
          <h2 className="mt-4 text-lg font-black text-foreground">
            우리 커플만의 캐릭터를 함께 키워보세요
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            만남 인증과 작은 데이트 미션을 달성할 때마다 아기 삐약이가 설렘 앵무, 로맨틱 백조로 진화합니다.
          </p>
          <button
            type="button"
            onClick={openLoginModal}
            className="mt-5 rounded-full bg-primary px-6 py-3 text-xs font-extrabold text-white hover:bg-primary-hover"
          >
            로그인하고 커플 스페이스 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary">
            COUPLE LOUNGE
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            만날수록 자라나는 우리 둘의 스페이스
          </h1>
          <p className="mt-1 text-sm text-muted">
            데이트 체크인과 작은 미션으로 커플 펫을 키우고 함께 쌓은 시간을 기록해요.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary-soft px-4 py-2 text-xs font-extrabold text-primary sm:self-auto">
          <Flame className="h-4 w-4" />
          <span>
            {coupleStatus === "CONNECTED" ? "커플 연결됨 · " : "연결 대기 중 · "}
            누적 만남 {pet?.totalMeetDays ?? 0}회
          </span>
        </div>
      </header>

      {feedbackMessage && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
            feedbackMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {!hasLoaded ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-[28px] border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-xs font-bold text-muted">
            커플 스페이스와 펫 정보를 불러오고 있어요...
          </p>
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-12">
          {/* Pet Character Card */}
          <div className="flex flex-col justify-between rounded-[28px] bg-surface-dark p-6 text-white shadow-lg sm:p-8 lg:col-span-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                LEVEL {String(pet?.level ?? 1).padStart(2, "0")} ·{" "}
                {pet?.name ?? stageMeta.stageLabel}
              </span>
              <span className="text-xs font-semibold text-white/65">
                다음 진화까지 {remainingExp} XP
              </span>
            </div>

            <div className="my-8 flex flex-col items-center text-center">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-primary/30 via-white/10 to-amber-300/30 text-6xl ring-1 ring-white/20">
                {stageMeta.emoji}
              </div>
              <h2 className="mt-4 text-xl font-black">{stageMeta.quote}</h2>
              <p className="mt-1 max-w-sm text-xs text-white/70">
                {isAlreadyCheckedInToday
                  ? `오늘(${todayIso}) 만남 인증을 완료했어요! 미션을 달성하면 추가 경험치를 얻을 수 있어요.`
                  : "오늘 연인과 만났다면 만남 인증 버튼으로 경험치를 선물해 주세요."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex justify-between text-xs font-bold">
                  <span>성장 경험치</span>
                  <span className="text-amber-300">
                    {pet?.exp ?? 0} / {pet?.nextLevelExp ?? 100} XP
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    style={{ width: `${expPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-500"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isCheckingIn || isAlreadyCheckedInToday}
                onClick={() => void handleCheckInToday()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/60"
              >
                {isCheckingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isAlreadyCheckedInToday ? (
                  <Check className="h-4 w-4 text-amber-300" />
                ) : null}
                <span>
                  {isAlreadyCheckedInToday
                    ? "오늘 만남 인증 완료됨 (내일 다시 가능)"
                    : "오늘의 만남 인증하기 (+20 XP)"}
                </span>
              </button>
            </div>
          </div>

          {/* Right Stacked Bento Cards */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            {/* Couple Invite & Connect Ticket */}
            <article className="rounded-[28px] border border-line bg-surface p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                    <HeartHandshake className="h-4 w-4" />
                    <span>
                      {coupleStatus === "CONNECTED"
                        ? "커플 연결 완료"
                        : "연인 연결 · 초대 코드"}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-extrabold text-foreground">
                    {coupleStatus === "CONNECTED"
                      ? connectedSummary?.partnerNickname
                        ? `${connectedSummary.partnerNickname}님과 함께 데이트 기록을 쌓고 있어요`
                        : "연인과 코스와 일기장이 실시간으로 공유되고 있어요"
                      : "6자리 코드로 코스와 일기장을 연결하세요"}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    내 코드를 복사해 연인에게 보내거나, 연인의 초대 코드를 아래에 입력해 즉시 연결할 수 있어요.
                  </p>
                </div>
              </div>

              {/* My Invite Code */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold text-muted">내 초대 코드</p>
                  <span className="font-mono text-base font-black tracking-[0.25em] text-foreground">
                    {inviteInfo?.inviteCode ?? "------"}
                  </span>
                </div>

                {inviteInfo ? (
                  <button
                    type="button"
                    onClick={() => void handleCopyInviteCode()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-2xs hover:bg-surface-subtle"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-primary" />
                        <span>코드 복사</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isGeneratingCode}
                    onClick={() => void handleGenerateInviteCode()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white"
                  >
                    <span>코드 발급</span>
                  </button>
                )}
              </div>

              {/* Connect with Partner Code */}
              {coupleStatus !== "CONNECTED" && (
                <div className="mt-4 space-y-2.5 rounded-2xl bg-background p-4">
                  <p className="text-xs font-extrabold text-foreground">
                    상대방 초대 코드로 연결하기
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      maxLength={20}
                      value={partnerCodeInput}
                      onChange={(e) =>
                        setPartnerCodeInput(e.target.value.toUpperCase())
                      }
                      placeholder="상대방 6자리 코드 입력"
                      className="rounded-xl border border-line bg-surface px-3.5 py-2 font-mono text-xs font-bold tracking-widest uppercase outline-none focus:border-primary"
                    />
                    <input
                      type="date"
                      value={startedDateInput}
                      onChange={(e) => setStartedDateInput(e.target.value)}
                      aria-label="사귀기 시작한 날"
                      className="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={() => void handleConnectPartner()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-dark py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5 text-amber-300" />
                    )}
                    <span>연인과 커플 연결 확정하기</span>
                  </button>
                </div>
              )}
            </article>

            {/* Daily Date Missions */}
            <article className="flex-1 rounded-[28px] border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    오늘의 데이트 미션
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    클릭해 완료하면 즉시 커플 펫 경험치가 적립됩니다
                  </p>
                </div>
                <Link
                  href="/diaries"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  일기장 바로가기 →
                </Link>
              </div>

              <div className="mt-4 space-y-2.5">
                {missions.map((mission) => {
                  const isBusy = completingMissionId === mission.missionLogId;
                  return (
                    <button
                      key={mission.missionLogId}
                      type="button"
                      disabled={mission.isCompleted || isBusy}
                      onClick={() => void handleCompleteMission(mission)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                        mission.isCompleted
                          ? "border-primary/25 bg-primary-soft/40"
                          : "border-line bg-background hover:border-primary/45"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {isBusy ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : (
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              mission.isCompleted
                                ? "text-primary"
                                : "text-muted/40"
                            }`}
                          />
                        )}
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              mission.isCompleted
                                ? "text-foreground/70 line-through"
                                : "text-foreground"
                            }`}
                          >
                            {mission.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            {mission.description}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-extrabold text-primary">
                        {mission.isCompleted
                          ? "완료됨"
                          : `+${mission.rewardExp} XP`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
