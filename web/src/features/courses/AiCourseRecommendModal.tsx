"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Save,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDurationKo } from "@/features/map/geo-utils";
import { ApiError } from "@/shared/api/client";
import type {
  CourseRecommendationPreview,
  DateTheme,
  DateTimeSlot,
  FoodCategory,
} from "@/shared/api/types";
import { recommendCourse } from "./courses-api";

interface AiCourseRecommendModalProps {
  onApplyToBuilder: (
    preview: CourseRecommendationPreview,
    meta: { themes: DateTheme[]; timeSlot: DateTimeSlot },
  ) => void;
  onSaveDirectly: (
    preview: CourseRecommendationPreview,
    meta: { themes: DateTheme[]; timeSlot: DateTimeSlot },
  ) => Promise<void>;
  onClose: () => void;
}

const REGION_CHIPS = ["성수역", "연남동", "한남동", "강남역", "혜화역"];

const THEMES: DateTheme[] = [
  "감성 카페",
  "맛집 투어",
  "전시·문화",
  "액티비티",
  "산책·야외",
  "어디든",
];

const FOODS: FoodCategory[] = [
  "일식",
  "양식",
  "한식",
  "고기",
  "중식",
  "치킨",
  "분식",
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

  const [regionKeyword, setRegionKeyword] = useState("성수역");
  const [selectedThemes, setSelectedThemes] = useState<DateTheme[]>([
    "감성 카페",
    "전시·문화",
  ]);
  const [selectedFoods, setSelectedFoods] = useState<FoodCategory[]>(["일식"]);
  const [budgetPerPerson, setBudgetPerPerson] = useState<number>(40000);
  const [timeSlot, setTimeSlot] = useState<DateTimeSlot>("HALF_DAY");
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
        themeTags: selectedThemes,
        foodCategories: selectedFoods,
        budgetPerPerson,
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
      await onSaveDirectly(preview, { themes: selectedThemes, timeSlot });
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
          {/* 1. Region */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-foreground">
              1. 어디서 만날까요?
            </label>
            <input
              type="text"
              value={regionKeyword}
              onChange={(e) => setRegionKeyword(e.target.value)}
              placeholder="역·동네 입력 (예: 성수역, 연남동, 한남동)"
              className="w-full rounded-2xl border border-line bg-background px-4 py-2.5 text-sm font-bold text-foreground outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-1.5">
              {REGION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRegionKeyword(chip)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    regionKeyword === chip
                      ? "bg-surface-dark text-white"
                      : "border border-line bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
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
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        active
                          ? "bg-primary text-white"
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
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      timeSlot === slot.code
                        ? "bg-surface-dark text-white"
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
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      active
                        ? "bg-surface-dark text-white"
                        : "border border-line bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    {food}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 10,000원-step Budget Slider */}
          <div className="rounded-2xl border border-line bg-background p-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="ai-budget-slider"
                className="text-xs font-extrabold text-foreground"
              >
                5. 1인 예산 설정{" "}
                <span className="font-medium text-muted">(10,000원 단위)</span>
              </label>
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-xs font-extrabold text-primary">
                1인 {budgetPerPerson.toLocaleString()}원 (2인{" "}
                {(budgetPerPerson * 2).toLocaleString()}원)
              </span>
            </div>
            <input
              id="ai-budget-slider"
              type="range"
              min={10000}
              max={100000}
              step={10000}
              value={budgetPerPerson}
              onChange={(e) => setBudgetPerPerson(Number(e.target.value))}
              className="mt-2.5 h-2 w-full cursor-pointer accent-primary"
            />
            <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted">
              <span>1만원</span>
              <span>3만원</span>
              <span>5만원</span>
              <span>7만원</span>
              <span>10만원</span>
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
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      active
                        ? "bg-primary-soft text-primary ring-1 ring-primary"
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
                <span>실존 핫플 후보를 분석해 최적 동선을 조합 중...</span>
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
    </div>
  );
}

