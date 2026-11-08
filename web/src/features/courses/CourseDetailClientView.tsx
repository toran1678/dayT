"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookmarkPlus,
  Calendar,
  Check,
  Clock,
  Download,
  ExternalLink,
  Footprints,
  Loader2,
  Navigation,
  Pencil,
  Radio,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  CourseRouteMap,
  type RouteMapStop,
} from "@/features/map/CourseRouteMap";
import {
  addMinutesToClock,
  estimateWalkingRoute,
  formatDistanceKo,
  formatDurationKo,
} from "@/features/map/geo-utils";
import { ApiError } from "@/shared/api/client";
import type {
  CourseDetail,
  DateTimeSlot,
  PlaceCategoryGroup,
} from "@/shared/api/types";
import { CourseBuilderClientView } from "./CourseBuilderClientView";
import { connectCourseCollabStomp } from "./collab-stomp-client";
import {
  openCourseGoogleMapsNavigation,
  shareCoursePass,
} from "./course-actions";
import {
  createCourse,
  deleteCourse,
  downloadCourseKml,
  fetchCourseDetail,
  fetchSharedCourseApi,
  updateCourseCollaboration,
} from "./courses-api";

interface CourseDetailClientViewProps {
  courseId?: number;
  shareToken?: string;
}

const CATEGORY_LABELS: Record<PlaceCategoryGroup, string> = {
  RESTAURANT: "식당·다이닝",
  CAFE: "카페·디저트",
  EXHIBITION: "전시·문화",
  ACTIVITY: "공방·액티비티",
  PARK: "산책·공원",
  ETC: "스팟",
};

const TIME_SLOT_CLOCK: Record<DateTimeSlot, { label: string; start: string }> = {
  HALF_DAY: { label: "반나절 코스", start: "13:00" },
  ALL_DAY: { label: "종일 코스", start: "11:30" },
  EVENING: { label: "저녁 무드", start: "18:00" },
};

export function CourseDetailClientView({
  courseId,
  shareToken,
}: CourseDetailClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    accessToken,
    isInitializing,
    openLoginModal,
    authenticatedFetch,
  } = useAuth();

  const isSharedPublicView = Boolean(shareToken);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(
    () => searchParams.get("mode") === "edit",
  );
  const [focusedOrder, setFocusedOrder] = useState<number | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);
  const [isDownloadingKml, setIsDownloadingKml] = useState(false);
  const [isTogglingCollab, setIsTogglingCollab] = useState(false);
  const [isCloningShared, setIsCloningShared] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [liveCollabState, setLiveCollabState] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [liveCollabToast, setLiveCollabToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isSharedPublicView && (isInitializing || !user)) {
      return;
    }
    let active = true;
    async function load() {
      try {
        const data = shareToken
          ? await fetchSharedCourseApi(shareToken)
          : await fetchCourseDetail(authenticatedFetch, courseId ?? 0);
        if (active) {
          setCourse(data);
          setErrorMessage(null);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("코스 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [
    isSharedPublicView,
    shareToken,
    courseId,
    isInitializing,
    user,
    authenticatedFetch,
  ]);

  const activeCollabCourseId =
    !isEditing && !isSharedPublicView && course?.isCollabOpen && accessToken
      ? course.id
      : null;

  useEffect(() => {
    if (!activeCollabCourseId || !accessToken) {
      return;
    }

    const handle = connectCourseCollabStomp(activeCollabCourseId, accessToken, {
      onConnectStateChange: (state) => {
        setLiveCollabState(state);
      },
      onBroadcast: (event) => {
        if (
          event.clientSessionId &&
          event.clientSessionId === handle.sessionId
        ) {
          return;
        }
        if (event.course) {
          setCourse(event.course);
        }
        if (event.action === "SYNC_COURSE") {
          setLiveCollabToast(
            `${event.editorNickname}님이 동선을 실시간으로 수정했어요`,
          );
        } else if (event.action === "PRESENCE_JOIN") {
          setLiveCollabToast(
            `${event.editorNickname}님이 함께 코스를 보고 있어요`,
          );
        }
      },
    });

    return () => {
      handle.disconnect();
    };
  }, [activeCollabCourseId, accessToken]);

  const timelineItems = useMemo(() => {
    if (!course) return [];
    const baseClock = course.timeSlot
      ? TIME_SLOT_CLOCK[course.timeSlot].start
      : "13:00";
    const result: (CourseDetail["places"][number] & {
      arrivalClock: string;
      walkMeters: number;
    })[] = [];
    let elapsed = 0;
    for (let idx = 0; idx < course.places.length; idx++) {
      const item = course.places[idx];
      const arrivalClock = addMinutesToClock(baseClock, elapsed);
      elapsed += item.stayMinutes + item.travelMinutesToNext;
      const nextItem = course.places[idx + 1];
      const walkMeters = nextItem
        ? estimateWalkingRoute(
            item.place.latitude,
            item.place.longitude,
            nextItem.place.latitude,
            nextItem.place.longitude,
          ).walkingMeters
        : 0;
      result.push({
        ...item,
        arrivalClock,
        walkMeters,
      });
    }
    return result;
  }, [course]);

  const mapStops = useMemo<RouteMapStop[]>(
    () =>
      timelineItems.map((item) => ({
        id: item.place.id,
        order: item.visitOrder,
        name: item.place.name,
        address: item.place.address,
        categoryLabel: CATEGORY_LABELS[item.place.categoryGroup],
        latitude: item.place.latitude,
        longitude: item.place.longitude,
        stayMinutes: item.stayMinutes,
        estimatedCost: item.estimatedCost,
        memo: item.memo,
        placeUrl: item.place.placeUrl,
      })),
    [timelineItems],
  );

  async function handleOpenGoogleMaps() {
    if (!course) return;
    setIsOpeningMaps(true);
    try {
      await openCourseGoogleMapsNavigation({
        authenticatedFetch,
        courseId: course.id,
        isAuthenticated: Boolean(user) && !isSharedPublicView,
        fallbackCourse: course,
      });
    } finally {
      setIsOpeningMaps(false);
    }
  }

  async function handleCopyShareLink() {
    if (!course) return;
    const outcome = await shareCoursePass({
      title: course.title,
      description: course.description,
      shareToken: course.shareToken,
    });
    if (outcome === "copied") {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  }

  async function handleDownloadKml() {
    if (!course) return;
    if (!user || !accessToken) {
      openLoginModal();
      return;
    }
    setIsDownloadingKml(true);
    try {
      await downloadCourseKml(accessToken, course.id, course.title);
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "KML 파일을 내려받는 중 오류가 발생했습니다.",
      );
    } finally {
      setIsDownloadingKml(false);
    }
  }

  async function handleToggleCollaboration() {
    if (!course) return;
    setIsTogglingCollab(true);
    try {
      const updated = await updateCourseCollaboration(
        authenticatedFetch,
        course.id,
        !course.isCollabOpen,
      );
      setCourse(updated);
      setLiveCollabToast(
        updated.isCollabOpen
          ? "실시간 공동 편집이 켜졌어요! 이제 연인과 동시에 경유지를 편집할 수 있습니다."
          : "실시간 공동 편집이 종료되었습니다.",
      );
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "공동 편집 상태 변경에 실패했습니다.",
      );
    } finally {
      setIsTogglingCollab(false);
    }
  }

  async function handleCloneSharedToMyVault() {
    if (!course) return;
    if (!user) {
      openLoginModal();
      return;
    }
    setIsCloningShared(true);
    try {
      const cloned = await createCourse(authenticatedFetch, {
        title: `${course.title} (담아온 코스)`,
        description: course.description,
        themeTags: course.themeTags,
        timeSlot: course.timeSlot,
        sourceType: course.sourceType,
        shareWithCouple: Boolean(user.coupleId),
        places: course.places.map((item, idx) => ({
          placeId: item.place.id,
          visitOrder: idx + 1,
          estimatedCost: item.estimatedCost,
          stayMinutes: item.stayMinutes,
          travelMinutesToNext:
            idx === course.places.length - 1 ? 0 : item.travelMinutesToNext,
          memo: item.memo,
        })),
      });
      router.push(`/courses/${cloned.id}`);
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "내 보관함으로 코스를 담지 못했습니다.",
      );
      setIsCloningShared(false);
    }
  }

  async function handleDelete() {
    if (!course) return;
    if (!window.confirm(`'${course.title}' 코스를 삭제하시겠어요?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCourse(authenticatedFetch, course.id);
      router.push("/courses");
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("삭제 중 오류가 발생했습니다.");
      }
      setIsDeleting(false);
    }
  }

  if (!isSharedPublicView && !isInitializing && !user) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <p className="text-base font-black text-foreground">
          내 코스를 조회하려면 로그인이 필요합니다.
        </p>
        <button
          type="button"
          onClick={openLoginModal}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (isLoading || (!isSharedPublicView && isInitializing)) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="mt-3 text-xs font-bold text-muted">
          데이트 동선과 지도 데이터를 불러오고 있어요...
        </p>
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/75 p-8 text-center">
        <p className="text-sm font-extrabold text-red-600">
          {errorMessage ?? "코스를 찾을 수 없습니다."}
        </p>
        <Link
          href="/courses"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>코스 보관함으로 돌아가기</span>
        </Link>
      </div>
    );
  }

  const isOwnerOrPartner =
    Boolean(user) &&
    (user?.id === course.creatorId ||
      (course.coupleId !== null && user?.coupleId === course.coupleId));

  const canModify =
    isOwnerOrPartner || Boolean(user && !isSharedPublicView && course.isCollabOpen);

  if (isEditing && canModify) {
    return (
      <CourseBuilderClientView
        initialCourse={course}
        onSaved={(updated) => {
          setCourse(updated);
          setIsEditing(false);
          router.replace(`/courses/${updated.id}`);
        }}
        onCancelEdit={() => {
          setIsEditing(false);
          router.replace(`/courses/${course.id}`);
        }}
      />
    );
  }

  const hasRouteStops = course.places.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>코스 보관함</span>
        </Link>
        {isSharedPublicView && (
          <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-extrabold text-primary">
            공유된 데이트 패스
          </span>
        )}
      </div>

      {course.isCollabOpen && !isSharedPublicView && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/85 px-4 py-2.5 text-xs font-bold text-emerald-800">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {liveCollabState === "connected"
                ? "실시간 공동 편집 채널 연결됨 (/ws/collab)"
                : "실시간 공동 편집 모드 활성화됨"}
            </span>
            {liveCollabToast && (
              <span className="text-emerald-700/80">· {liveCollabToast}</span>
            )}
          </div>
          {canModify && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-emerald-700"
            >
              동시 편집 참여하기 →
            </button>
          )}
        </div>
      )}

      {/* Course Header */}
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-surface p-6 shadow-[0_8px_28px_rgba(24,24,27,0.03)] sm:flex-row sm:items-center sm:p-7">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-0.5 text-[11px] font-extrabold text-primary">
              <Sparkles className="h-3 w-3" />
              <span>
                {course.sourceType === "AI_RECOMMENDED"
                  ? "AI 추천 코스"
                  : "직접 설계 코스"}
              </span>
            </span>
            {course.timeSlot && (
              <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[11px] font-bold text-muted">
                {TIME_SLOT_CLOCK[course.timeSlot].label}
              </span>
            )}
            {course.datePlanDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                <Calendar className="h-3 w-3" />
                <span>{course.datePlanDate} 데이트</span>
              </span>
            )}
            {course.themeTags.map((theme) => (
              <span key={theme} className="text-xs font-semibold text-muted">
                #{theme}
              </span>
            ))}
          </div>

          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-xs text-muted sm:text-sm">{course.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasRouteStops && (
            <button
              type="button"
              disabled={isOpeningMaps}
              onClick={() => void handleOpenGoogleMaps()}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
            >
              {isOpeningMaps ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
              ) : (
                <Navigation className="h-3.5 w-3.5 text-amber-300" />
              )}
              <span>구글맵 원클릭 길안내</span>
            </button>
          )}

          {hasRouteStops && !isSharedPublicView && (
            <button
              type="button"
              disabled={isDownloadingKml}
              onClick={() => void handleDownloadKml()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary/40 disabled:opacity-60"
            >
              {isDownloadingKml ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Download className="h-3.5 w-3.5 text-primary" />
              )}
              <span>구글 내 지도 KML</span>
            </button>
          )}

          {isSharedPublicView && (
            <button
              type="button"
              disabled={isCloningShared}
              onClick={() => void handleCloneSharedToMyVault()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {isCloningShared ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )}
              <span>내 보관함으로 코스 담기</span>
            </button>
          )}

          {isOwnerOrPartner && !isSharedPublicView && (
            <button
              type="button"
              disabled={isTogglingCollab}
              onClick={() => void handleToggleCollaboration()}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-extrabold transition-colors disabled:opacity-60 ${
                course.isCollabOpen
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-line bg-background text-foreground hover:border-primary/40"
              }`}
            >
              {isTogglingCollab ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
              <span>
                {course.isCollabOpen ? "공동 편집 ON" : "공동 편집 열기"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopyShareLink()}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary/40"
          >
            {copiedShare ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>공유 링크 복사됨!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>카톡 · 링크 공유</span>
              </>
            )}
          </button>

          {canModify && !isSharedPublicView && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>{course.isCollabOpen ? "공동 편집" : "코스 수정"}</span>
            </button>
          )}

          {isOwnerOrPartner && !isSharedPublicView && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-background px-3.5 py-2.5 text-xs font-bold text-muted hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>삭제</span>
            </button>
          )}
        </div>
      </header>

      {/* Split Layout: Timeline (Left) + Route Map & Summary (Right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-7">
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <div className="space-y-2">
              {timelineItems.map((step, idx) => {
                const isLast = idx === timelineItems.length - 1;
                const isFocused = focusedOrder === step.visitOrder;
                return (
                  <div key={`${step.place.id}-${step.visitOrder}`}>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setFocusedOrder(step.visitOrder)}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-xs ${
                            isFocused
                              ? "bg-surface-dark text-amber-300 ring-2 ring-amber-300"
                              : "bg-primary text-white"
                          }`}
                        >
                          {step.visitOrder}
                        </button>
                        {!isLast && (
                          <div className="my-1.5 w-0.5 flex-1 bg-gradient-to-b from-primary/60 to-line" />
                        )}
                      </div>

                      <div
                        onClick={() => setFocusedOrder(step.visitOrder)}
                        className={`mb-3 flex-1 cursor-pointer rounded-2xl border bg-background p-4 transition-colors sm:p-5 ${
                          isFocused
                            ? "border-primary shadow-[0_6px_20px_rgba(232,93,63,0.08)]"
                            : "border-line hover:border-primary/35"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-primary">
                              {step.arrivalClock}
                            </span>
                            <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                              {CATEGORY_LABELS[step.place.categoryGroup]}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {step.stayMinutes}분 체류 ·{" "}
                            {step.estimatedCost === 0
                              ? "무료"
                              : `2인 ${step.estimatedCost.toLocaleString()}원`}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-extrabold text-foreground">
                              {step.place.name}
                            </h3>
                            <p className="text-xs text-muted">
                              {step.place.address}
                            </p>
                          </div>
                          {step.place.placeUrl && (
                            <a
                              href={step.place.placeUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-primary hover:underline"
                            >
                              <span>장소 링크</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        {step.memo && (
                          <p className="mt-2.5 rounded-xl bg-surface px-3 py-2 text-xs text-foreground/85">
                            <strong className="mr-1.5 text-primary">메모</strong>
                            {step.memo}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isLast && (
                      <div className="mb-3 ml-12 inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3.5 py-1 text-[11px] font-semibold text-muted">
                        <Footprints className="h-3 w-3 text-primary" />
                        <span>
                          도보 {step.travelMinutesToNext}분 (
                          {formatDistanceKo(step.walkMeters)})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-24">
            <CourseRouteMap
              stops={mapStops}
              polyline={course.routePolyline}
              connectRoute={true}
              activeOrder={focusedOrder}
              onSelectStop={(s) => setFocusedOrder(s.order)}
              headerTitle={`확정 데이트 동선 (${course.places.length}곳)`}
              heightClassName="h-80 lg:h-96"
            />

            <div className="rounded-3xl bg-surface-dark p-6 text-white shadow-md">
              <p className="text-[11px] font-bold tracking-widest text-amber-300">
                PASS SUMMARY
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span>2인 총 예상 비용</span>
                  </div>
                  <p className="mt-1.5 text-xl font-black">
                    {course.totalEstimatedCost.toLocaleString()}원
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    1인당 약{" "}
                    {Math.round(course.totalEstimatedCost / 2).toLocaleString()}원
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                    <span>총 소요 시간</span>
                  </div>
                  <p className="mt-1.5 text-xl font-black">
                    {formatDurationKo(course.totalDurationMinutes)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    경유지 총 {course.places.length}곳 포함
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
