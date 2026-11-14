"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Loader2,
  MapPin,
  Save,
  Sparkles,
  TrainFront,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDurationKo } from "@/features/map/geo-utils";
import {
  searchSubwayStations,
  type SubwayStationHint,
} from "@/features/places/subway-search-data";
import { ApiError } from "@/shared/api/client";
import type {
  CourseRecommendationPreview,
  DateTheme,
  DateTimeSlot,
  FoodCategory,
} from "@/shared/api/types";
import { recommendCourse } from "./courses-api";
import { LocationPinPickerModal } from "./LocationPinPickerModal";

interface AiCourseRecommendModalProps {
  onApplyToBuilder: (
    preview: CourseRecommendationPreview,
    meta: {
      themes: DateTheme[];
      timeSlot: DateTimeSlot;
      datePlanDate?: string | null;
    },
  ) => void;
  onSaveDirectly: (
    preview: CourseRecommendationPreview,
    meta: {
      themes: DateTheme[];
      timeSlot: DateTimeSlot;
      datePlanDate?: string | null;
    },
  ) => Promise<void>;
  onClose: () => void;
}

const REGION_CHIPS = [
  "성수역",
  "홍대·연남",
  "인천 구월동",
  "부산 서면",
  "대구 동성로",
  "대전 둔산",
];

const THEMES: DateTheme[] = [
  "감성 카페",
  "맛집 투어",
  "전시·문화",
  "액티비티",
  "산책·야외",
  "어디든",
  "행사·축제",
];

const FOODS: FoodCategory[] = [
  "일식",
  "양식",
  "한식",
  "고기",
  "중식",
  "치킨",
  "분식",
  "기타",
];

const TIME_SLOTS: { code: DateTimeSlot; label: string }[] = [
  { code: "HALF_DAY", label: "반나절 (3곳)" },
  { code: "ALL_DAY", label: "종일 (4곳)" },
  { code: "EVENING", label: "저녁 무드 (2~3곳)" },
];

const MOOD_PRESETS = [
  "비 오는 날 실내",
  "조용한 대화",
  "기념일 무드",
  "사진 맛집",
  "도보 이동 최소",
];

export function AiCourseRecommendModal({
  onApplyToBuilder,
  onSaveDirectly,
  onClose,
}: AiCourseRecommendModalProps) {
  const { user, openLoginModal, authenticatedFetch } = useAuth();

  const [regionKeyword, setRegionKeyword] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(2.5);
  const [isPinPickerOpen, setIsPinPickerOpen] = useState<boolean>(false);

  // Autocomplete hints state for 전국 상권/지하철역
  const [isSearchHintOpen, setIsSearchHintOpen] = useState(false);
  const [searchHints, setSearchHints] = useState<SubwayStationHint[]>([]);
  const [activeHintIdx, setActiveHintIdx] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchHintOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [selectedThemes, setSelectedThemes] = useState<DateTheme[]>([
    "감성 카페",
    "전시·문화",
  ]);
  const [selectedFoods, setSelectedFoods] = useState<FoodCategory[]>(["일식"]);
  const [sliderBudget, setSliderBudget] = useState<number>(40000);
  const [isUnlimitedBudget, setIsUnlimitedBudget] = useState<boolean>(false);
  const [timeSlot, setTimeSlot] = useState<DateTimeSlot>("HALF_DAY");
  const [targetDate, setTargetDate] = useState<string>("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([
    "도보 이동 최소",
  ]);

  const [preview, setPreview] = useState<CourseRecommendationPreview | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleTheme(theme: DateTheme) {
    setSelectedThemes((prev) =>
      prev.includes(theme)
        ? prev.length > 1
          ? prev.filter((t) => t !== theme)
          : prev
        : [...prev, theme],
    );
  }

  function toggleFood(food: FoodCategory) {
    setSelectedFoods((prev) =>
      prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food],
    );
  }

  function toggleMood(mood: string) {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  }

  async function handleGenerate() {
    if (!regionKeyword.trim()) {
      setErrorMessage("희망 지역 키워드를 입력해주세요.");
      return;
    }
    if (!user) {
      setErrorMessage("AI 맞춤 코스 추천을 받으려면 먼저 로그인해주세요!");
      openLoginModal();
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const result = await recommendCourse(authenticatedFetch, {
        regionKeyword: regionKeyword.trim(),
        latitude: selectedPoint?.lat ?? null,
        longitude: selectedPoint?.lng ?? null,
        radiusKm,
        targetDate: targetDate ? targetDate : null,
        themeTags: selectedThemes,
        foodCategories: selectedFoods,
        budgetPerPerson: isUnlimitedBudget ? 0 : sliderBudget,
        timeSlot,
        moodKeywords: selectedMoods,
      });
      setPreview(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "AI 코스 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleConfirmDirectSave() {
    if (!preview) return;
    setIsSavingDirect(true);
    try {
      await onSaveDirectly(preview, {
        themes: selectedThemes,
        timeSlot,
        datePlanDate: targetDate || null,
      });
    } finally {
      setIsSavingDirect(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-extrabold tracking-widest text-primary">
                GEMINI AI CURATOR
              </p>
              <h2 className="text-base font-black text-foreground">
                취향 · 예산 맞춤 AI 데이트 코스 자동 설계
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-2 text-muted hover:bg-surface-subtle hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* 1. Region & Map Pin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-foreground">
                1. 어디서 만날까요?
              </label>
              <button
                type="button"
                onClick={() => setIsPinPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-black text-primary transition-colors hover:bg-primary hover:text-white"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>지도에서 핀 꽂기</span>
              </button>
            </div>

            {selectedPoint && (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft/40 px-3 py-2 text-xs">
                <span className="font-extrabold text-primary">
                  📍 지도 지정 핀: {regionKeyword} ({selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPoint(null)}
                  className="rounded-full p-1 text-muted hover:bg-surface-subtle hover:text-foreground"
                  title="핀 지정 취소"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input with Search Form Styling & Autocomplete Hints */}
            <div ref={searchContainerRef} className="relative">
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-background px-3.5 py-2.5 shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <TrainFront className="h-4 w-4 shrink-0 text-primary" />
                <input
                  type="text"
                  value={regionKeyword}
                  onFocus={() => {
                    setSearchHints(searchSubwayStations(regionKeyword));
                    setIsSearchHintOpen(true);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegionKeyword(val);
                    setSelectedPoint(null);
                    setSearchHints(searchSubwayStations(val));
                    setIsSearchHintOpen(true);
                    setActiveHintIdx(-1);
                  }}
                  onKeyDown={(e) => {
                    if (!isSearchHintOpen || searchHints.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveHintIdx((prev) =>
                        prev < searchHints.length - 1 ? prev + 1 : 0,
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveHintIdx((prev) =>
                        prev > 0 ? prev - 1 : searchHints.length - 1,
                      );
                    } else if (e.key === "Enter" && activeHintIdx >= 0) {
                      e.preventDefault();
                      const chosen = searchHints[activeHintIdx];
                      setRegionKeyword(chosen.name);
                      setSelectedPoint(null);
                      setIsSearchHintOpen(false);
                    } else if (e.key === "Escape") {
                      setIsSearchHintOpen(false);
                    }
                  }}
                  placeholder="지하철역 또는 데이트 상권 검색 (예: 성수역, 구월동, 서면, 동성로 등)"
                  className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-foreground outline-none placeholder:font-medium placeholder:text-muted/60"
                />
              </div>

              {/* Autocomplete Hints Dropdown */}
              {isSearchHintOpen && searchHints.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-primary/25 bg-surface/98 p-1.5 shadow-[0_12px_36px_rgba(24,24,27,0.15)] backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold text-muted flex items-center justify-between border-b border-line/60 mb-1">
                    <span>전국 주요 지하철역 및 상권 추천 검색</span>
                    <span className="text-[9px] font-normal text-muted/80">
                      방향키 이동 · Enter 선택
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {searchHints.map((hint, idx) => {
                      const isFocused = idx === activeHintIdx;
                      return (
                        <button
                          key={hint.id}
                          type="button"
                          onMouseEnter={() => setActiveHintIdx(idx)}
                          onClick={() => {
                            setRegionKeyword(hint.name);
                            setSelectedPoint(null);
                            setIsSearchHintOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                            isFocused
                              ? "bg-primary-soft text-primary font-black"
                              : "text-foreground hover:bg-surface-subtle"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              style={{
                                backgroundColor:
                                  hint.lines[0]?.color ?? "#F05454",
                              }}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white shadow-2xs"
                            >
                              {hint.kind === "area" ? (
                                <MapPin className="h-3 w-3" />
                              ) : (
                                <TrainFront className="h-3 w-3" />
                              )}
                            </span>
                            <span className="text-xs font-extrabold truncate">
                              {hint.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {hint.lines.map((l) => (
                                <span
                                  key={l.label}
                                  style={{
                                    borderColor: `${l.color}40`,
                                    color: l.color,
                                  }}
                                  className="rounded border bg-surface px-1 py-0.2 text-[9px] font-black"
                                >
                                  {l.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="hidden sm:inline text-[11px] font-medium text-muted truncate max-w-[200px]">
                            {hint.areaHint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {REGION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setRegionKeyword(chip);
                    setSelectedPoint(null);
                    setIsSearchHintOpen(false);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    regionKeyword === chip && !selectedPoint
                      ? "bg-surface-dark text-white"
                      : "border border-line bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 1-1. Search Radius (km) Slider */}
          <div className="rounded-2xl border border-line bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-foreground">
                탐색 반경 설정 (내 주변 탐색 범위)
              </span>
              <span className="inline-flex h-7 items-center rounded-full bg-primary-soft px-3 text-xs font-extrabold text-primary">
                반경 {radiusKm.toFixed(1)}km (
                {radiusKm <= 1.5
                  ? "도보 중심"
                  : radiusKm <= 3.0
                    ? "동네·인근 중심"
                    : radiusKm <= 5.0
                      ? "차량/대중교통 이동"
                      : "광역 데이트 코스"}
                )
              </span>
            </div>

            <div className="mt-3">
              <input
                id="ai-radius-slider"
                type="range"
                min={0.5}
                max={10.0}
                step={0.5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <div className="mt-1.5 flex justify-between text-[11px] font-bold text-muted">
                <span>0.5km (도보 7분)</span>
                <span>10.0km (광역)</span>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[
                { km: 1.0, label: "1km (도보)" },
                { km: 2.0, label: "2km (동네)" },
                { km: 3.0, label: "3km (인근)" },
                { km: 5.0, label: "5km (차량/교통)" },
                { km: 10.0, label: "10km (광역)" },
              ].map((item) => (
                <button
                  key={item.km}
                  type="button"
                  onClick={() => setRadiusKm(item.km)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                    radiusKm === item.km
                      ? "border border-primary bg-primary text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1-2. Date Picker (언제 만날까요?) */}
          <div className="rounded-2xl border border-line bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="ai-target-date"
                className="flex items-center gap-1.5 text-xs font-extrabold text-foreground"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>언제 만날까요? (데이트 예정일 선택)</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setTargetDate(new Date().toISOString().split("T")[0])
                  }
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                    targetDate === new Date().toISOString().split("T")[0]
                      ? "bg-primary text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const day = now.getDay();
                    const diff = (6 - day + 7) % 7 || 7;
                    const sat = new Date(now.getTime() + diff * 86400000);
                    setTargetDate(sat.toISOString().split("T")[0]);
                  }}
                  className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-bold text-muted hover:text-foreground transition-colors"
                >
                  이번 주말
                </button>
                {targetDate && (
                  <button
                    type="button"
                    onClick={() => setTargetDate("")}
                    className="text-[11px] font-bold text-muted hover:text-primary transition-colors ml-1"
                    title="날짜 초기화"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2.5">
              <input
                id="ai-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-foreground outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-muted">
              💡 날짜를 지정하고 테마에서 &apos;행사·축제&apos;를 선택하시면 해당 일자에 열리는 축제·야시장·팝업스토어를 최우선으로 코스에 반영해 드립니다!
            </p>
          </div>

          {/* 2. Themes & TimeSlot */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="block text-xs font-extrabold text-foreground">
                2. 데이트 테마 (복수 선택)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {THEMES.map((theme) => {
                  const active = selectedThemes.includes(theme);
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => toggleTheme(theme)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        active
                          ? "border border-primary bg-primary text-white"
                          : "border border-line bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                      <span>{theme}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-extrabold text-foreground">
                3. 데이트 시간대
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.code}
                    type="button"
                    onClick={() => setTimeSlot(slot.code)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      timeSlot === slot.code
                        ? "border border-surface-dark bg-surface-dark text-white"
                        : "border border-line bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Food Preferences */}
          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-foreground">
              4. 선호하는 식사 메뉴 (선택)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FOODS.map((food) => {
                const active = selectedFoods.includes(food);
                return (
                  <button
                    key={food}
                    type="button"
                    onClick={() => toggleFood(food)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      active
                        ? "border border-surface-dark bg-surface-dark text-white"
                        : "border border-line bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    {food}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 1인 하루 총 예산 설정 (예산 무관 옵션 포함 & 고정 높이 뱃지로 레이아웃 시프트 방지) */}
          <div className="rounded-2xl border border-line bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="ai-budget-slider"
                className="text-xs font-extrabold text-foreground"
              >
                5. 1인 하루 총 예산 설정
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnlimitedBudget((prev) => !prev)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    isUnlimitedBudget
                      ? "border border-primary bg-primary text-white shadow-xs"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {isUnlimitedBudget ? "✓ 예산 무관" : "예산 무관"}
                </button>

                <span className="inline-flex h-7 items-center rounded-full bg-primary-soft px-3 text-xs font-extrabold text-primary">
                  {isUnlimitedBudget
                    ? "1인 예산 무관 (분위기·인기 중심)"
                    : `1인 하루 ${sliderBudget.toLocaleString()}원 (2인 ${(
                        sliderBudget * 2
                      ).toLocaleString()}원)`}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <input
                id="ai-budget-slider"
                type="range"
                min={10000}
                max={100000}
                step={10000}
                value={sliderBudget}
                onChange={(e) => {
                  setSliderBudget(Number(e.target.value));
                  setIsUnlimitedBudget(false);
                }}
                className={`h-2 w-full cursor-pointer accent-primary ${
                  isUnlimitedBudget ? "opacity-50" : "opacity-100"
                }`}
              />
              <div className="mt-1.5 flex justify-between text-[11px] font-bold text-muted">
                <span>10,000원</span>
                <span>100,000원</span>
              </div>
            </div>
          </div>

          {/* 5. Mood Keywords */}
          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-foreground">
              6. 오늘의 무드 · 날씨 조건
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_PRESETS.map((mood) => {
                const active = selectedMoods.includes(mood);
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      active
                        ? "border border-primary bg-primary-soft text-primary"
                        : "border border-line bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    #{mood}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-bold text-red-600">
              {errorMessage}
            </div>
          )}

          {/* Generate CTA */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerate()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-white shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>주변 장소를 분석해 최적 동선을 조합 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{preview ? "조건으로 다시 추천받기" : "AI 맞춤 코스 생성하기"}</span>
              </>
            )}
          </button>

          {/* AI Preview Result Card */}
          {preview && (
            <div className="space-y-4 rounded-3xl border border-primary/35 bg-primary-soft/35 p-5">
              <div>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                  AI 추천 프리뷰
                </span>
                <h3 className="mt-2 text-base font-black text-foreground">
                  {preview.suggestedTitle}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {preview.aiReason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-surface p-3.5 text-xs">
                <div className="flex items-center gap-1.5 font-extrabold text-foreground">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span>2인 약 {preview.totalEstimatedCost.toLocaleString()}원</span>
                </div>
                <div className="flex items-center gap-1.5 font-extrabold text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>총 {formatDurationKo(preview.totalDurationMinutes)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {preview.places.map((step) => (
                  <div
                    key={`${step.place.id}-${step.visitOrder}`}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                      {step.visitOrder}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-extrabold text-foreground">
                          {step.place.name}
                        </p>
                        <span className="shrink-0 text-[11px] font-bold text-muted">
                          {step.stayMinutes}분 · 2인{" "}
                          {step.estimatedCost.toLocaleString()}원
                        </span>
                      </div>
                      {step.memo && (
                        <p className="mt-0.5 text-[11px] text-muted">
                          {step.memo}
                        </p>
                      )}
                      {step.travelMinutesToNext > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-primary">
                          ↓ 다음 장소까지 도보 약 {step.travelMinutesToNext}분
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    onApplyToBuilder(preview, {
                      themes: selectedThemes,
                      timeSlot,
                      datePlanDate: targetDate || null,
                    })
                  }
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-2.5 text-xs font-extrabold text-foreground hover:border-primary"
                >
                  <span>메이커로 불러와 세부 편집</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </button>
                <button
                  type="button"
                  disabled={isSavingDirect}
                  onClick={() => void handleConfirmDirectSave()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface-dark py-2.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {isSavingDirect ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 text-amber-300" />
                  )}
                  <span>바로 내 코스로 확정 저장</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isPinPickerOpen && (
        <LocationPinPickerModal
          initialLat={selectedPoint?.lat}
          initialLng={selectedPoint?.lng}
          initialKeyword={regionKeyword}
          radiusKm={radiusKm}
          onSelectLocation={(lat, lng, label) => {
            setSelectedPoint({ lat, lng });
            setRegionKeyword(label);
          }}
          onClose={() => setIsPinPickerOpen(false)}
        />
      )}
    </div>
  );
}

