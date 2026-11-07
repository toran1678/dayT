"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Compass,
  Footprints,
  HeartHandshake,
  Loader2,
  Map as MapIcon,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wallet,
  X,
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
import {
  clearDraftPlaces,
  readDraftPlaces,
  writeDraftPlaces,
} from "@/features/places/draft-course-storage";
import { searchPlacesApi } from "@/features/places/places-api";
import { ApiError } from "@/shared/api/client";
import type {
  CourseDetail,
  CourseRecommendationPreview,
  CourseSourceType,
  CourseUpsertRequest,
  DateTheme,
  DateTimeSlot,
  PlaceCategoryGroup,
  PlaceDetail,
} from "@/shared/api/types";
import { AiCourseRecommendModal } from "./AiCourseRecommendModal";
import { createCourse, updateCourse } from "./courses-api";
import { PlacePickerModal } from "./PlacePickerModal";

export interface EditableCourseStop {
  uid: string;
  place: PlaceDetail;
  estimatedCost: number;
  stayMinutes: number;
  travelMinutesToNext: number;
  walkingMetersToNext: number;
  isManualTravelTime: boolean;
  memo: string;
}

interface CourseBuilderClientViewProps {
  initialCourse?: CourseDetail;
  onSaved?: (saved: CourseDetail) => void;
  onCancelEdit?: () => void;
}

const ALL_THEMES: DateTheme[] = [
  "감성 카페",
  "맛집 투어",
  "전시·문화",
  "액티비티",
  "산책·야외",
  "어디든",
];

const TIME_SLOTS: { code: DateTimeSlot; label: string; defaultClock: string }[] =
  [
    { code: "HALF_DAY", label: "반나절 (3~4시간)", defaultClock: "13:00" },
    { code: "ALL_DAY", label: "종일 코스 (6~8시간)", defaultClock: "11:30" },
    { code: "EVENING", label: "저녁 무드 (2~3시간)", defaultClock: "18:00" },
  ];

const CATEGORY_LABELS: Record<PlaceCategoryGroup, string> = {
  RESTAURANT: "식당·다이닝",
  CAFE: "카페·디저트",
  EXHIBITION: "전시·문화",
  ACTIVITY: "공방·액티비티",
  PARK: "산책·공원",
  ETC: "스팟",
};

function defaultStayMinutesForCategory(cat: PlaceCategoryGroup): number {
  switch (cat) {
    case "RESTAURANT":
      return 70;
    case "CAFE":
      return 60;
    case "EXHIBITION":
      return 90;
    case "ACTIVITY":
      return 90;
    case "PARK":
      return 50;
    default:
      return 60;
  }
}

function recalculateStopTransfers(
  rawStops: EditableCourseStop[],
): EditableCourseStop[] {
  return rawStops.map((stop, idx) => {
    const isLast = idx === rawStops.length - 1;
    if (isLast) {
      return {
        ...stop,
        travelMinutesToNext: 0,
        walkingMetersToNext: 0,
      };
    }
    const next = rawStops[idx + 1];
    const walk = estimateWalkingRoute(
      stop.place.latitude,
      stop.place.longitude,
      next.place.latitude,
      next.place.longitude,
    );
    return {
      ...stop,
      walkingMetersToNext: walk.walkingMeters,
      travelMinutesToNext: stop.isManualTravelTime
        ? Math.max(1, stop.travelMinutesToNext)
        : walk.walkingMinutes,
    };
  });
}

function buildInitialStops(initialCourse?: CourseDetail): EditableCourseStop[] {
  if (initialCourse) {
    const mapped: EditableCourseStop[] = initialCourse.places.map(
      (item, idx) => ({
        uid: `${item.place.id}-${idx}-${item.visitOrder}`,
        place: item.place,
        estimatedCost: item.estimatedCost,
        stayMinutes: item.stayMinutes,
        travelMinutesToNext: item.travelMinutesToNext,
        walkingMetersToNext: 0,
        isManualTravelTime: item.travelMinutesToNext > 0,
        memo: item.memo ?? "",
      }),
    );
    return recalculateStopTransfers(mapped);
  }

  const drafts = readDraftPlaces();
  const mapped: EditableCourseStop[] = drafts.map((place, idx) => ({
    uid: `${place.id}-${idx}`,
    place,
    estimatedCost:
      place.avgPricePerPerson !== null ? place.avgPricePerPerson * 2 : 0,
    stayMinutes: defaultStayMinutesForCategory(place.categoryGroup),
    travelMinutesToNext: 0,
    walkingMetersToNext: 0,
    isManualTravelTime: false,
    memo: "",
  }));
  return recalculateStopTransfers(mapped);
}

export function CourseBuilderClientView({
  initialCourse,
  onSaved,
  onCancelEdit,
}: CourseBuilderClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, openLoginModal, authenticatedFetch } = useAuth();
  const isEditMode = Boolean(initialCourse);

  const [title, setTitle] = useState<string>(
    () => initialCourse?.title ?? "성수동 오후 감성 전시 & 로스터리 루트",
  );
  const [description, setDescription] = useState<string>(
    () =>
      initialCourse?.description ??
      "식사부터 전시, 디저트까지 도보로 여유롭게 이어지는 데이트 코스",
  );
  const [selectedThemes, setSelectedThemes] = useState<DateTheme[]>(() =>
    initialCourse && initialCourse.themeTags.length > 0
      ? initialCourse.themeTags
      : ["감성 카페", "맛집 투어"],
  );
  const [timeSlot, setTimeSlot] = useState<DateTimeSlot>(
    () => initialCourse?.timeSlot ?? "HALF_DAY",
  );
  const [sourceType, setSourceType] = useState<CourseSourceType>(
    () => initialCourse?.sourceType ?? "CUSTOM",
  );
  const [startClock, setStartClock] = useState<string>("13:00");
  const [shareWithCouple, setShareWithCouple] = useState<boolean>(() =>
    Boolean(initialCourse?.coupleId),
  );

  const [stops, setStops] = useState<EditableCourseStop[]>(() =>
    buildInitialStops(initialCourse),
  );
  const [focusedOrder, setFocusedOrder] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(
    () => !isEditMode && searchParams.get("ai") === "1",
  );
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline");

  function syncStops(updater: (prev: EditableCourseStop[]) => EditableCourseStop[]) {
    setStops((prev) => {
      const updated = recalculateStopTransfers(updater(prev));
      if (!isEditMode) {
        writeDraftPlaces(updated.map((s) => s.place));
      }
      return updated;
    });
  }

  function handleToggleTheme(theme: DateTheme) {
    setSelectedThemes((prev) => {
      if (prev.includes(theme)) {
        return prev.length > 1 ? prev.filter((t) => t !== theme) : prev;
      }
      return [...prev, theme];
    });
  }

  function handleAddPlace(place: PlaceDetail) {
    syncStops((prev) => [
      ...prev,
      {
        uid: `${place.id}-${Date.now()}-${prev.length}`,
        place,
        estimatedCost:
          place.avgPricePerPerson !== null
            ? place.avgPricePerPerson * 2
            : 0,
        stayMinutes: defaultStayMinutesForCategory(place.categoryGroup),
        travelMinutesToNext: 0,
        walkingMetersToNext: 0,
        isManualTravelTime: false,
        memo: "",
      },
    ]);
    setErrorMessage(null);
  }

  function handleMoveStop(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    syncStops((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, {
        ...moved,
        isManualTravelTime: false,
      });
      return next.map((item) => ({ ...item, isManualTravelTime: false }));
    });
    setFocusedOrder(target + 1);
  }

  function handleRemoveStop(uid: string) {
    syncStops((prev) => prev.filter((s) => s.uid !== uid));
  }

  function handleUpdateStopField(
    uid: string,
    patch: Partial<
      Pick<
        EditableCourseStop,
        "estimatedCost" | "stayMinutes" | "travelMinutesToNext" | "isManualTravelTime" | "memo"
      >
    >,
  ) {
    setStops((prev) =>
      recalculateStopTransfers(
        prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
      ),
    );
  }

  async function handleLoadStarterCourse() {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const res = await searchPlacesApi({
        keyword: "성수역",
        radiusMeters: 2000,
        page: 0,
        size: 6,
      });
      const starter = res.items.slice(0, 3);
      if (starter.length > 0) {
        syncStops(() =>
          starter.map((place, idx) => ({
            uid: `${place.id}-starter-${idx}`,
            place,
            estimatedCost:
              place.avgPricePerPerson !== null
                ? place.avgPricePerPerson * 2
                : 0,
            stayMinutes: defaultStayMinutesForCategory(place.categoryGroup),
            travelMinutesToNext: 0,
            walkingMetersToNext: 0,
            isManualTravelTime: false,
            memo: "",
          })),
        );
      }
    } catch {
      setErrorMessage(
        "기본 추천 장소를 불러오지 못했습니다. 백엔드 서버 실행 상태를 확인해주세요.",
      );
    } finally {
      setIsLoadingSample(false);
    }
  }

  function handleApplyAiRecommendation(
    preview: CourseRecommendationPreview,
    meta: { themes: DateTheme[]; timeSlot: DateTimeSlot },
  ) {
    setTitle(preview.suggestedTitle);
    setDescription(preview.aiReason);
    if (meta.themes.length > 0) {
      setSelectedThemes(meta.themes);
    }
    setTimeSlot(meta.timeSlot);
    const matchingSlot = TIME_SLOTS.find((s) => s.code === meta.timeSlot);
    if (matchingSlot) {
      setStartClock(matchingSlot.defaultClock);
    }
    setSourceType("AI_RECOMMENDED");

    const aiStops: EditableCourseStop[] = preview.places.map((item, idx) => ({
      uid: `ai-${item.place.id}-${Date.now()}-${idx}`,
      place: item.place,
      estimatedCost: item.estimatedCost,
      stayMinutes: item.stayMinutes,
      travelMinutesToNext: item.travelMinutesToNext,
      walkingMetersToNext: 0,
      isManualTravelTime: item.travelMinutesToNext > 0,
      memo: item.memo ?? "",
    }));

    const calculated = recalculateStopTransfers(aiStops);
    setStops(calculated);
    if (!isEditMode) {
      writeDraftPlaces(calculated.map((s) => s.place));
    }
    setFocusedOrder(1);
    setErrorMessage(null);
    setIsAiModalOpen(false);
  }

  async function handleSaveAiDirectly(
    preview: CourseRecommendationPreview,
    meta: { themes: DateTheme[]; timeSlot: DateTimeSlot },
  ) {
    const payload: CourseUpsertRequest = {
      title: preview.suggestedTitle.trim() || "AI 맞춤 추천 데이트 코스",
      description: preview.aiReason.trim() || null,
      themeTags: meta.themes.length > 0 ? meta.themes : selectedThemes,
      timeSlot: meta.timeSlot,
      sourceType: "AI_RECOMMENDED",
      shareWithCouple,
      places: preview.places.map((item, idx) => ({
        placeId: item.place.id,
        visitOrder: idx + 1,
        estimatedCost: Math.max(0, Math.round(item.estimatedCost)),
        stayMinutes: Math.max(0, Math.round(item.stayMinutes)),
        travelMinutesToNext:
          idx === preview.places.length - 1
            ? 0
            : Math.max(0, Math.round(item.travelMinutesToNext)),
        memo: item.memo?.trim() || null,
      })),
    };

    const saved = await createCourse(authenticatedFetch, payload);
    clearDraftPlaces();
    setIsAiModalOpen(false);
    router.push(`/courses/${saved.id}`);
  }

  async function handleSaveCourse() {
    if (!title.trim()) {
      setErrorMessage("코스 제목을 입력해주세요.");
      return;
    }
    if (stops.length === 0) {
      setErrorMessage("최소 1곳 이상의 경유지를 추가해주세요.");
      return;
    }
    if (!user) {
      setErrorMessage(
        "코스를 저장하려면 먼저 로그인해주세요. 작성한 동선은 그대로 유지됩니다!",
      );
      openLoginModal();
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: CourseUpsertRequest = {
      title: title.trim(),
      description: description.trim() || null,
      themeTags: selectedThemes,
      timeSlot,
      sourceType,
      shareWithCouple,
      places: stops.map((stop, idx) => ({
        placeId: stop.place.id,
        visitOrder: idx + 1,
        estimatedCost: Math.max(0, Math.round(stop.estimatedCost)),
        stayMinutes: Math.max(0, Math.round(stop.stayMinutes)),
        travelMinutesToNext:
          idx === stops.length - 1
            ? 0
            : Math.max(0, Math.round(stop.travelMinutesToNext)),
        memo: stop.memo.trim() || null,
      })),
    };

    try {
      const saved =
        isEditMode && initialCourse
          ? await updateCourse(authenticatedFetch, initialCourse.id, payload)
          : await createCourse(authenticatedFetch, payload);

      if (!isEditMode) {
        clearDraftPlaces();
      }
      if (onSaved) {
        onSaved(saved);
      } else {
        router.push(`/courses/${saved.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("코스 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Computed Timeline Arrival Clocks & Totals
  const timelineWithClocks = useMemo(() => {
    const result: (EditableCourseStop & {
      order: number;
      arrivalClock: string;
    })[] = [];
    let elapsed = 0;
    for (let index = 0; index < stops.length; index++) {
      const stop = stops[index];
      const arrivalClock = addMinutesToClock(startClock, elapsed);
      elapsed += stop.stayMinutes + stop.travelMinutesToNext;
      result.push({
        ...stop,
        order: index + 1,
        arrivalClock,
      });
    }
    return result;
  }, [stops, startClock]);

  const summary = useMemo(() => {
    const totalCost = stops.reduce((acc, s) => acc + s.estimatedCost, 0);
    const totalStayMinutes = stops.reduce((acc, s) => acc + s.stayMinutes, 0);
    const totalTravelMinutes = stops.reduce(
      (acc, s) => acc + s.travelMinutesToNext,
      0,
    );
    const totalWalkingMeters = stops.reduce(
      (acc, s) => acc + s.walkingMetersToNext,
      0,
    );
    const totalDurationMinutes = totalStayMinutes + totalTravelMinutes;

    const diningMins = stops
      .filter((s) => s.place.categoryGroup === "RESTAURANT")
      .reduce((a, b) => a + b.stayMinutes, 0);
    const cafeMins = stops
      .filter((s) => s.place.categoryGroup === "CAFE")
      .reduce((a, b) => a + b.stayMinutes, 0);
    const cultureMins = stops
      .filter(
        (s) =>
          s.place.categoryGroup !== "RESTAURANT" &&
          s.place.categoryGroup !== "CAFE",
      )
      .reduce((a, b) => a + b.stayMinutes, 0);

    const denom = Math.max(1, totalDurationMinutes);
    return {
      totalCost,
      perPersonCost: Math.round(totalCost / 2),
      totalStayMinutes,
      totalTravelMinutes,
      totalDurationMinutes,
      totalWalkingMeters,
      diningPct: Math.round((diningMins / denom) * 100),
      cafePct: Math.round((cafeMins / denom) * 100),
      culturePct: Math.round((cultureMins / denom) * 100),
      travelPct: Math.round((totalTravelMinutes / denom) * 100),
    };
  }, [stops]);

  const mapStops = useMemo<RouteMapStop[]>(
    () =>
      timelineWithClocks.map((item) => ({
        id: item.place.id,
        order: item.order,
        name: item.place.name,
        address: item.place.address,
        categoryLabel: CATEGORY_LABELS[item.place.categoryGroup],
        latitude: item.place.latitude,
        longitude: item.place.longitude,
        stayMinutes: item.stayMinutes,
        estimatedCost: item.estimatedCost,
        memo: item.memo || null,
        placeUrl: item.place.placeUrl,
      })),
    [timelineWithClocks],
  );

  const existingPlaceIds = useMemo(
    () => new Set(stops.map((s) => s.place.id)),
    [stops],
  );

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <header className="rounded-3xl border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(24,24,27,0.03)] sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[11px] font-extrabold text-primary">
                {isEditMode ? "EDIT ITINERARY" : "ITINERARY STUDIO"}
              </span>
              <span className="text-xs font-semibold text-muted">
                경유지 순서를 바꾸면 도보 거리·소요 시간·예산이 실시간 재계산됩니다
              </span>
            </div>

            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="데이트 코스 제목을 입력하세요 (예: 성수동 오후 전시 & 로스터리 루트)"
              className="w-full border-b border-transparent bg-transparent pb-1 text-xl font-black tracking-tight text-foreground outline-none transition-colors focus:border-primary sm:text-2xl"
            />

            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="코스에 대한 한 줄 메모나 분위기를 적어보세요 (선택)"
              className="w-full bg-transparent text-xs font-medium text-muted outline-none focus:text-foreground sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isEditMode && (
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>AI 맞춤 코스 설계</span>
              </button>
            )}

            {user?.coupleId && (
              <button
                type="button"
                onClick={() => setShareWithCouple((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  shareWithCouple
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-line bg-background text-muted hover:text-foreground"
                }`}
              >
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>
                  {shareWithCouple ? "커플 공유 ON" : "나만 보기"}
                </span>
              </button>
            )}

            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-surface-subtle"
              >
                <X className="h-3.5 w-3.5" />
                <span>취소</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSaveCourse()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isEditMode ? "수정 내용 저장" : "코스 저장하기"}</span>
            </button>
          </div>
        </div>

        {/* Theme Tags & TimeSlot Controls */}
        <div className="mt-5 flex flex-col gap-3 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold text-muted">테마</span>
            {ALL_THEMES.map((theme) => {
              const active = selectedThemes.includes(theme);
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => handleToggleTheme(theme)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    active
                      ? "bg-surface-dark text-white"
                      : "border border-line bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {active && <Check className="h-3 w-3 text-amber-300" />}
                  <span>#{theme}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.code}
                type="button"
                onClick={() => {
                  setTimeSlot(slot.code);
                  setStartClock(slot.defaultClock);
                }}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  timeSlot === slot.code
                    ? "bg-primary text-white"
                    : "border border-line bg-background text-muted hover:text-foreground"
                }`}
              >
                {slot.label}
              </button>
            ))}

            <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-3 py-1 text-xs font-bold text-foreground">
              <Clock className="h-3 w-3 text-primary" />
              <span>출발</span>
              <input
                type="time"
                value={startClock}
                onChange={(e) => setStartClock(e.target.value || "13:00")}
                className="bg-transparent text-xs font-extrabold outline-none"
              />
            </label>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-bold text-red-600">
            {errorMessage}
          </div>
        )}
      </header>

      {/* Mobile View Switcher (< lg) */}
      <div className="flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("timeline")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-extrabold ${
            mobileTab === "timeline"
              ? "bg-surface-dark text-white"
              : "border border-line bg-surface text-muted"
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          <span>경유지 편집 ({stops.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-extrabold ${
            mobileTab === "map"
              ? "bg-surface-dark text-white"
              : "border border-line bg-surface text-muted"
          }`}
        >
          <MapIcon className="h-3.5 w-3.5" />
          <span>동선 지도 & 예산 리포트</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Connected Vertical Itinerary Rail */}
        <section
          className={`space-y-4 lg:col-span-7 ${
            mobileTab === "map" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
            {timelineWithClocks.length === 0 ? (
              <div className="py-12 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <h2 className="mt-3 text-base font-black text-foreground">
                  아직 코스에 담긴 장소가 없어요
                </h2>
                <p className="mt-1 text-xs text-muted">
                  직접 장소를 검색해 경유지를 추가하거나, 성수동 인기 3코스 예시를 불러와 시작해보세요!
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>AI 맞춤 코스 자동 설계</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
                  >
                    <Plus className="h-4 w-4" />
                    <span>경유지 검색 · 추가하기</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLoadingSample}
                    onClick={() => void handleLoadStarterCourse()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary/40"
                  >
                    {isLoadingSample && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    )}
                    <span>성수동 기본 3코스 불러오기</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {timelineWithClocks.map((step, idx) => {
                  const isLast = idx === timelineWithClocks.length - 1;
                  const isFocused = focusedOrder === step.order;

                  return (
                    <div key={step.uid}>
                      <div className="flex gap-3.5 sm:gap-4">
                        {/* Left Order & Connector Line */}
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => setFocusedOrder(step.order)}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-xs transition-transform hover:scale-105 ${
                              isFocused
                                ? "bg-surface-dark text-amber-300 ring-2 ring-amber-300"
                                : "bg-primary text-white"
                            }`}
                          >
                            {step.order}
                          </button>
                          {!isLast && (
                            <div className="my-1.5 w-0.5 flex-1 bg-gradient-to-b from-primary/60 to-line" />
                          )}
                        </div>

                        {/* Editable Stop Card */}
                        <div
                          onClick={() => setFocusedOrder(step.order)}
                          className={`mb-3 flex-1 rounded-2xl border bg-background p-4 transition-colors sm:p-5 ${
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

                            {/* Reorder & Remove Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStop(idx, -1);
                                }}
                                aria-label="위로 이동"
                                className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-foreground disabled:opacity-35"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStop(idx, 1);
                                }}
                                aria-label="아래로 이동"
                                className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-foreground disabled:opacity-35"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveStop(step.uid);
                                }}
                                aria-label="경유지 삭제"
                                className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:border-red-300 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="mt-1.5 text-base font-extrabold text-foreground">
                            {step.place.name}
                          </h3>
                          <p className="text-xs text-muted">
                            {step.place.address}
                          </p>

                          {/* Stay Duration & 2-Person Cost Controls */}
                          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                            <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2">
                              <span className="text-[11px] font-semibold text-muted">
                                체류 시간
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStopField(step.uid, {
                                      stayMinutes: Math.max(
                                        15,
                                        step.stayMinutes - 15,
                                      ),
                                    });
                                  }}
                                  className="h-6 w-6 rounded-md bg-background text-xs font-extrabold text-foreground hover:bg-primary-soft hover:text-primary"
                                >
                                  -
                                </button>
                                <span className="min-w-12 text-center text-xs font-extrabold text-foreground">
                                  {step.stayMinutes}분
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStopField(step.uid, {
                                      stayMinutes: Math.min(
                                        360,
                                        step.stayMinutes + 15,
                                      ),
                                    });
                                  }}
                                  className="h-6 w-6 rounded-md bg-background text-xs font-extrabold text-foreground hover:bg-primary-soft hover:text-primary"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <label className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2">
                              <span className="text-[11px] font-semibold text-muted">
                                {step.place.avgPricePerPerson === null &&
                                step.estimatedCost === 0
                                  ? "2인 비용 (미확인·직접 입력)"
                                  : "2인 예상 비용"}
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={5000}
                                  value={step.estimatedCost}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    handleUpdateStopField(step.uid, {
                                      estimatedCost: Math.max(
                                        0,
                                        Number(e.target.value) || 0,
                                      ),
                                    })
                                  }
                                  className="w-20 bg-transparent text-right text-xs font-extrabold text-foreground outline-none"
                                />
                                <span className="text-xs font-bold text-muted">
                                  원
                                </span>
                              </div>
                            </label>
                          </div>

                          {/* Memo Input */}
                          <input
                            type="text"
                            maxLength={255}
                            value={step.memo}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateStopField(step.uid, {
                                memo: e.target.value,
                              })
                            }
                            placeholder="방문 팁·메모 (예: 오픈 직후 창가 좌석 선점, 시그니처 메뉴 주문)"
                            className="mt-2.5 w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted/70 focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Walking Transfer Connector */}
                      {!isLast && (
                        <div className="mb-3 ml-12 inline-flex flex-wrap items-center gap-2 rounded-full bg-surface-subtle px-3.5 py-1 text-[11px] font-semibold text-muted">
                          <Footprints className="h-3 w-3 text-primary" />
                          <span>
                            다음 장소까지 도보{" "}
                            <strong className="text-foreground">
                              {step.travelMinutesToNext}분
                            </strong>{" "}
                            ({formatDistanceKo(step.walkingMetersToNext)})
                          </span>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStopField(step.uid, {
                                  travelMinutesToNext: Math.max(
                                    1,
                                    step.travelMinutesToNext - 2,
                                  ),
                                  isManualTravelTime: true,
                                })
                              }
                              className="rounded px-1 text-[10px] font-bold text-muted hover:bg-surface hover:text-foreground"
                            >
                              -2분
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStopField(step.uid, {
                                  travelMinutesToNext:
                                    step.travelMinutesToNext + 2,
                                  isManualTravelTime: true,
                                })
                              }
                              className="rounded px-1 text-[10px] font-bold text-muted hover:bg-surface hover:text-foreground"
                            >
                              +2분
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/45 bg-primary-soft/35 py-3.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary-soft/75"
            >
              <Plus className="h-4 w-4" />
              <span>다음 경유지 검색 · 추가하기</span>
            </button>
          </div>
        </section>

        {/* Right: [F-05] Interactive Route Map + Receipt Budget/Duration Summary */}
        <aside
          className={`space-y-4 lg:col-span-5 ${
            mobileTab === "timeline" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-4 lg:sticky lg:top-24">
            <CourseRouteMap
              stops={mapStops}
              connectRoute={true}
              activeOrder={focusedOrder}
              onSelectStop={(stop) => setFocusedOrder(stop.order)}
              headerTitle={`코스 동선 프리뷰 (${stops.length}곳)`}
              heightClassName="h-72 lg:h-80"
            />

            {/* Receipt-Style Budget & Time Summary Card */}
            <div className="rounded-3xl bg-surface-dark p-6 text-white shadow-md">
              <p className="text-[11px] font-bold tracking-widest text-amber-300">
                ESTIMATED SUMMARY
              </p>
              <h2 className="mt-1 text-lg font-extrabold">
                예상 예산 & 소요 시간 리포트
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span>2인 총 예상 비용</span>
                  </div>
                  <p className="mt-1.5 text-xl font-black">
                    {summary.totalCost.toLocaleString()}원
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    1인당 약 {summary.perPersonCost.toLocaleString()}원
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                    <span>총 데이트 시간</span>
                  </div>
                  <p className="mt-1.5 text-xl font-black">
                    {formatDurationKo(summary.totalDurationMinutes)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    체류 {summary.totalStayMinutes}분 + 이동{" "}
                    {summary.totalTravelMinutes}분
                  </p>
                </div>
              </div>

              {/* Duration Breakdown Bar */}
              {stops.length > 0 && (
                <div className="mt-5 space-y-2">
                  <div className="flex flex-wrap justify-between gap-2 text-[11px] text-white/75">
                    <span>식사 {summary.diningPct}%</span>
                    <span>문화·산책 {summary.culturePct}%</span>
                    <span>카페 {summary.cafePct}%</span>
                    <span>이동 {summary.travelPct}%</span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      style={{ width: `${summary.diningPct}%` }}
                      className="bg-primary transition-all"
                    />
                    <div
                      style={{ width: `${summary.culturePct}%` }}
                      className="bg-amber-400 transition-all"
                    />
                    <div
                      style={{ width: `${summary.cafePct}%` }}
                      className="bg-emerald-400 transition-all"
                    />
                    <div
                      style={{ width: `${summary.travelPct}%` }}
                      className="bg-white/55 transition-all"
                    />
                  </div>
                  <p className="pt-1 text-[11px] text-white/65">
                    총 예상 도보 이동 거리:{" "}
                    <strong className="text-white">
                      {formatDistanceKo(summary.totalWalkingMeters)}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {isPickerOpen && (
        <PlacePickerModal
          existingPlaceIds={existingPlaceIds}
          initialKeyword={
            stops[0]?.place.address.split(" ")[1] ?? "성수역"
          }
          onAddPlace={(place) => {
            handleAddPlace(place);
            setIsPickerOpen(false);
          }}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {isAiModalOpen && (
        <AiCourseRecommendModal
          onApplyToBuilder={handleApplyAiRecommendation}
          onSaveDirectly={handleSaveAiDirectly}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}
    </div>
  );
}
