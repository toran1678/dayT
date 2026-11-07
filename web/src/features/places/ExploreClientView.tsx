"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Check,
  CloudRain,
  Compass,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { ApiError } from "@/shared/api/client";
import type {
  FoodCategory,
  FoodRecommendationResponse,
  PlaceCategoryGroup,
  PlaceDetail,
} from "@/shared/api/types";
import {
  CourseRouteMap,
  type RouteMapStop,
} from "@/features/map/CourseRouteMap";
import { readDraftPlaces, writeDraftPlaces } from "./draft-course-storage";
import { PlaceDetailModal } from "./PlaceDetailModal";
import {
  getPlaceDetailApi,
  recommendFoodsApi,
  searchPlacesApi,
} from "./places-api";

const REGION_PRESETS = ["성수역", "연남동", "한남동", "강남역", "혜화역"];

const CATEGORY_FILTERS: {
  code: PlaceCategoryGroup | "ALL";
  label: string;
}[] = [
  { code: "ALL", label: "전체 스팟" },
  { code: "RESTAURANT", label: "식당·다이닝" },
  { code: "CAFE", label: "로스터리·카페" },
  { code: "EXHIBITION", label: "전시·문화" },
  { code: "ACTIVITY", label: "공방·액티비티" },
  { code: "PARK", label: "산책·공원" },
];

const FOOD_CATEGORIES: FoodCategory[] = [
  "일식",
  "양식",
  "한식",
  "고기",
  "중식",
  "치킨",
  "분식",
];

const BUDGET_SLIDER_MIN = 10000;
const BUDGET_SLIDER_UNLIMITED = 110000;
const BUDGET_SLIDER_STEP = 10000;

const RADIUS_STEPS = [500, 1000, 2000, 3000, 5000, 10000] as const;

function formatRadiusLabel(meters: number): string {
  return meters < 1000 ? `${meters}m` : `${meters / 1000}km`;
}

function sliderValueToBudget(sliderVal: number): number | undefined {
  return sliderVal >= BUDGET_SLIDER_UNLIMITED ? undefined : sliderVal;
}

function budgetToSliderValue(budget: number | undefined): number {
  return budget === undefined ? BUDGET_SLIDER_UNLIMITED : budget;
}

function formatBudgetBadge(
  budget: number | undefined,
  unlimitedLabel: string,
): string {
  if (budget === undefined) return unlimitedLabel;
  return `~${budget.toLocaleString()}원`;
}

const CATEGORY_BADGE_LABELS: Record<PlaceCategoryGroup, string> = {
  RESTAURANT: "식당",
  CAFE: "카페",
  EXHIBITION: "전시",
  ACTIVITY: "액티비티",
  PARK: "공원·산책",
  ETC: "스팟",
};

export function ExploreClientView() {
  const [keywordInput, setKeywordInput] = useState("성수역");
  const [appliedKeyword, setAppliedKeyword] = useState("성수역");
  const [selectedCategory, setSelectedCategory] = useState<
    PlaceCategoryGroup | "ALL"
  >("ALL");
  const [radiusMeters, setRadiusMeters] = useState<number>(2000);
  const [sliderDraftRadiusIdx, setSliderDraftRadiusIdx] = useState<number>(2);
  const committedRadiusRef = useRef<number>(2000);
  const radiusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [sliderDraftPrice, setSliderDraftPrice] = useState<number>(
    BUDGET_SLIDER_UNLIMITED,
  );
  const committedMaxPriceRef = useRef<number | undefined>(undefined);
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [indoorOnly, setIndoorOnly] = useState(false);

  const [places, setPlaces] = useState<PlaceDetail[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  // [F-03] Food Recommendation Widget State
  const [isFoodPanelOpen, setIsFoodPanelOpen] = useState(false);
  const [recFoodCategory, setRecFoodCategory] = useState<
    FoodCategory | undefined
  >("일식");
  const [recBudget, setRecBudget] = useState<number | undefined>(30000);
  const [foodRecommendation, setFoodRecommendation] =
    useState<FoodRecommendationResponse | null>(null);
  const [isRecommendingFood, setIsRecommendingFood] = useState(false);

  // Detail Modal & Draft Course Cart
  const [activePlaceDetail, setActivePlaceDetail] =
    useState<PlaceDetail | null>(null);
  const [draftPlaces, setDraftPlaces] = useState<PlaceDetail[]>(() =>
    readDraftPlaces(),
  );

  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    return () => {
      if (priceDebounceRef.current) {
        clearTimeout(priceDebounceRef.current);
      }
      if (radiusDebounceRef.current) {
        clearTimeout(radiusDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPlaces() {
      try {
        const res = await searchPlacesApi({
          keyword: appliedKeyword,
          radiusMeters,
          categoryGroup:
            selectedCategory === "ALL" ? undefined : selectedCategory,
          maxPricePerPerson: maxPrice,
          isIndoor: indoorOnly ? true : undefined,
          page: 0,
          size: 20,
        });
        if (active) {
          setPlaces(res.items);
          setSearchError(null);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setSearchError(err.message);
        } else {
          setSearchError(
            "장소 목록을 불러오지 못했습니다. 백엔드 서버(18080) 실행 상태를 확인해주세요.",
          );
        }
      } finally {
        if (active) {
          setIsLoadingPlaces(false);
        }
      }
    }

    void loadPlaces();
    return () => {
      active = false;
    };
  }, [
    appliedKeyword,
    radiusMeters,
    selectedCategory,
    maxPrice,
    indoorOnly,
    reloadTick,
  ]);

  const triggerReload = useCallback(() => {
    setIsLoadingPlaces(true);
    setSearchError(null);
    setReloadTick((n) => n + 1);
  }, []);

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextKw = keywordInput.trim() || "성수역";
    setIsLoadingPlaces(true);
    setSearchError(null);
    if (nextKw === appliedKeyword) {
      setReloadTick((n) => n + 1);
    } else {
      setAppliedKeyword(nextKw);
    }
  }

  function selectRegionPreset(region: string) {
    setKeywordInput(region);
    if (region !== appliedKeyword) {
      setIsLoadingPlaces(true);
      setSearchError(null);
      setAppliedKeyword(region);
    }
  }

  async function handleRunFoodRecommend() {
    setIsRecommendingFood(true);
    try {
      const anchor = places[0];
      const res = await recommendFoodsApi({
        foodCategory: recFoodCategory,
        latitude: anchor?.latitude,
        longitude: anchor?.longitude,
        budgetPerPerson: recBudget,
      });
      setFoodRecommendation(res);
    } catch {
      // Keep UI responsive on error
    } finally {
      setIsRecommendingFood(false);
    }
  }

  async function handleOpenDetail(place: PlaceDetail) {
    setActivePlaceDetail(place);
    try {
      const fresh = await getPlaceDetailApi(place.id);
      setActivePlaceDetail(fresh);
    } catch {
      // Fallback to already loaded item
    }
  }

  function handleToggleDraft(place: PlaceDetail) {
    setDraftPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id);
      const next = exists
        ? prev.filter((p) => p.id !== place.id)
        : [...prev, place];
      writeDraftPlaces(next);
      return next;
    });
  }

  const draftIdSet = useMemo(
    () => new Set(draftPlaces.map((p) => p.id)),
    [draftPlaces],
  );

  const mapStops = useMemo<RouteMapStop[]>(() => {
    const source = draftPlaces.length >= 2 ? draftPlaces : places.slice(0, 6);
    return source.map((place, index) => ({
      id: place.id,
      order: index + 1,
      name: place.name,
      address: place.address,
      categoryLabel: CATEGORY_BADGE_LABELS[place.categoryGroup],
      latitude: place.latitude,
      longitude: place.longitude,
      estimatedCost:
        place.avgPricePerPerson !== null ? place.avgPricePerPerson * 2 : undefined,
      placeUrl: place.placeUrl,
    }));
  }, [places, draftPlaces]);

  const totalDraftCostForTwo = useMemo(
    () =>
      draftPlaces.reduce(
        (sum, p) => sum + (p.avgPricePerPerson ?? 0) * 2,
        0,
      ),
    [draftPlaces],
  );

  return (
    <div className="space-y-7">
      {/* Hero + Multi-Segment Real-Time Search Bar */}
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-[0_12px_40px_rgba(24,24,27,0.04)] sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>PostGIS 반경 탐색 & 카카오 로컬 실시간 연동</span>
            </div>
            <h1 className="text-2xl leading-tight font-black tracking-tight text-foreground sm:text-4xl">
              식당 찾고, 카페 또 검색하는 수고 없이{" "}
              <span className="text-primary">하루 코스를 한 번에.</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted sm:text-base">
              지하철역이나 동네를 검색해 주변 핫플을 골라 담거나, 예산에 딱 맞는 오늘의 메뉴를 추천받아 보세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsFoodPanelOpen((prev) => !prev);
              if (!foodRecommendation) {
                void handleRunFoodRecommend();
              }
            }}
            className="inline-flex items-center gap-2 self-start rounded-full bg-surface-dark px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-opacity hover:opacity-90 lg:self-auto"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-amber-300" />
            <span>오늘 뭐 먹지? 메뉴 추천기</span>
          </button>
        </div>

        {/* Region Preset Quick Chips */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted">인기 데이트 상권:</span>
          {REGION_PRESETS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => selectRegionPreset(region)}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                appliedKeyword === region
                  ? "bg-primary text-white"
                  : "border border-line bg-background text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative mt-4 grid gap-2 rounded-3xl border border-line bg-background p-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
        >
          <div className="flex items-center gap-3 rounded-xl px-3.5 py-2 lg:col-span-3">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <label
                htmlFor="explore-keyword-input"
                className="block text-[11px] font-semibold text-muted"
              >
                만날 역 · 동네 · 지역명
              </label>
              <input
                id="explore-keyword-input"
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="예: 구월동, 인천터미널, 성수역..."
                className="w-full bg-transparent text-sm font-extrabold text-foreground outline-none placeholder:font-normal placeholder:text-muted/60"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border-t border-line/70 px-3.5 py-2 sm:border-t-0 sm:border-l lg:col-span-3">
            <Compass className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="explore-radius-slider"
                  className="text-[11px] font-semibold text-muted"
                >
                  탐색 반경
                </label>
                <span className="text-xs font-extrabold text-primary">
                  반경 {formatRadiusLabel(RADIUS_STEPS[sliderDraftRadiusIdx] ?? 2000)}
                </span>
              </div>
              <input
                id="explore-radius-slider"
                type="range"
                min={0}
                max={RADIUS_STEPS.length - 1}
                step={1}
                value={sliderDraftRadiusIdx}
                onChange={(e) => {
                  const nextIdx = Number(e.target.value);
                  setSliderDraftRadiusIdx(nextIdx);
                  const nextMeters = RADIUS_STEPS[nextIdx] ?? 2000;
                  if (radiusDebounceRef.current) {
                    clearTimeout(radiusDebounceRef.current);
                  }
                  radiusDebounceRef.current = setTimeout(() => {
                    if (committedRadiusRef.current !== nextMeters) {
                      committedRadiusRef.current = nextMeters;
                      setIsLoadingPlaces(true);
                      setRadiusMeters(nextMeters);
                    }
                  }, 250);
                }}
                className="mt-1.5 h-1.5 w-full cursor-pointer accent-primary"
              />
              <div className="mt-0.5 flex justify-between text-[10px] font-semibold text-muted/80">
                <span>500m</span>
                <span>2km</span>
                <span>5km</span>
                <span>10km</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border-t border-line/70 px-3.5 py-2 lg:col-span-3 lg:border-t-0 lg:border-l">
            <Wallet className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="explore-budget-slider"
                  className="text-[11px] font-semibold text-muted"
                >
                  1인 예산 상한
                </label>
                <span className="text-xs font-extrabold text-primary">
                  {formatBudgetBadge(
                    sliderValueToBudget(sliderDraftPrice),
                    "제한 없음",
                  )}
                </span>
              </div>
              <input
                id="explore-budget-slider"
                type="range"
                min={BUDGET_SLIDER_MIN}
                max={BUDGET_SLIDER_UNLIMITED}
                step={BUDGET_SLIDER_STEP}
                value={sliderDraftPrice}
                onChange={(e) => {
                  const nextSliderVal = Number(e.target.value);
                  setSliderDraftPrice(nextSliderVal);
                  const nextBudget = sliderValueToBudget(nextSliderVal);
                  if (priceDebounceRef.current) {
                    clearTimeout(priceDebounceRef.current);
                  }
                  priceDebounceRef.current = setTimeout(() => {
                    if (committedMaxPriceRef.current !== nextBudget) {
                      committedMaxPriceRef.current = nextBudget;
                      setIsLoadingPlaces(true);
                      setMaxPrice(nextBudget);
                    }
                  }, 250);
                }}
                className="mt-1.5 h-1.5 w-full cursor-pointer accent-primary"
              />
              <div className="mt-0.5 flex justify-between text-[10px] font-semibold text-muted/80">
                <span>1만</span>
                <span>5만</span>
                <span>10만</span>
                <span>무관</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-2 sm:pt-2 lg:col-span-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-3">
            <button
              type="button"
              onClick={() => {
                setIsLoadingPlaces(true);
                setIndoorOnly((prev) => !prev);
              }}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-2.5 text-xs font-extrabold transition-colors ${
                indoorOnly
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              <CloudRain className="h-3.5 w-3.5 shrink-0" />
              <span>{indoorOnly ? "실내 ON" : "실내·야외"}</span>
            </button>

            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-primary-hover"
            >
              <Search className="h-3.5 w-3.5" />
              <span>
                반경 {formatRadiusLabel(RADIUS_STEPS[sliderDraftRadiusIdx] ?? 2000)} 탐색
              </span>
            </button>
          </div>
        </form>

        {/* [F-03] Interactive Food Recommendation Drawer */}
        {isFoodPanelOpen && (
          <div className="mt-5 rounded-3xl border border-primary/25 bg-primary-soft/45 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-extrabold text-primary">
                  🍽️ 취향 · 예산 맞춤 메뉴 추천기
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  원하는 음식 종류와 1인 예산을 고르면 현재 상권 주변의 딱 맞는 메뉴와 식당을 골라드려요.
                </p>
              </div>

              <button
                type="button"
                disabled={isRecommendingFood}
                onClick={() => void handleRunFoodRecommend()}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white hover:bg-primary-hover disabled:opacity-60 sm:self-auto"
              >
                {isRecommendingFood && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>다시 추천받기</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRecFoodCategory(undefined)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  recFoodCategory === undefined
                    ? "bg-surface-dark text-white"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                예산 맞춤 자동
              </button>
              {FOOD_CATEGORIES.map((fc) => (
                <button
                  key={fc}
                  type="button"
                  onClick={() => setRecFoodCategory(fc)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    recFoodCategory === fc
                      ? "bg-surface-dark text-white"
                      : "bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {fc}
                </button>
              ))}
            </div>

            <div className="mt-3.5 rounded-2xl border border-line/80 bg-surface px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="food-rec-budget-slider"
                  className="text-xs font-bold text-foreground"
                >
                  1인 예산 설정{" "}
                  <span className="font-medium text-muted">(10,000원 단위)</span>
                </label>
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-extrabold text-primary">
                  {formatBudgetBadge(recBudget, "예산 무관")}
                </span>
              </div>
              <input
                id="food-rec-budget-slider"
                type="range"
                min={BUDGET_SLIDER_MIN}
                max={BUDGET_SLIDER_UNLIMITED}
                step={BUDGET_SLIDER_STEP}
                value={budgetToSliderValue(recBudget)}
                onChange={(e) =>
                  setRecBudget(sliderValueToBudget(Number(e.target.value)))
                }
                className="mt-2 h-2 w-full cursor-pointer accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted">
                <span>1만원</span>
                <span>3만원</span>
                <span>5만원</span>
                <span>7만원</span>
                <span>10만원</span>
                <span>예산 무관</span>
              </div>
            </div>

            {foodRecommendation && (
              <div className="mt-4 rounded-2xl bg-surface p-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    {foodRecommendation.recommendedFoodCategory} 추천
                  </span>
                  <strong className="text-sm font-black text-foreground">
                    오늘의 추천 메뉴: {foodRecommendation.recommendedSubMenu}
                  </strong>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {foodRecommendation.reason}
                </p>

                {foodRecommendation.places.length > 0 && (
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {foodRecommendation.places.slice(0, 4).map((item) => {
                      const inDraft = draftIdSet.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-line bg-background p-3"
                        >
                          <button
                            type="button"
                            onClick={() => void handleOpenDetail(item)}
                            className="min-w-0 text-left"
                          >
                            <p className="truncate text-xs font-extrabold text-foreground hover:text-primary">
                              {item.name}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {item.subCategory ?? item.foodCategory} ·{" "}
                              {item.avgPricePerPerson !== null
                                ? item.avgPricePerPerson === 0
                                  ? "무료"
                                  : `1인 약 ${item.avgPricePerPerson.toLocaleString()}원`
                                : "가격 미확인"}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDraft(item)}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              inDraft
                                ? "bg-surface-dark text-white"
                                : "bg-primary-soft text-primary"
                            }`}
                          >
                            {inDraft ? "담김 ✓" : "+ 담기"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((tab) => (
            <button
              key={tab.code}
              type="button"
              onClick={() => {
                if (selectedCategory !== tab.code) {
                  setIsLoadingPlaces(true);
                  setSelectedCategory(tab.code);
                }
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                selectedCategory === tab.code
                  ? "bg-surface-dark text-white"
                  : "border border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {draftPlaces.length > 0 && (
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-primary-hover"
          >
            <span>담은 장소 {draftPlaces.length}곳으로 코스 짜기</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Main Split View: Live Place List (Left) + Dynamic Coordinate Map Preview (Right) */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                &lsquo;{appliedKeyword}&rsquo; 주변 탐색 결과{" "}
                <span className="text-primary">{places.length}곳</span>
              </h2>
              <p className="text-xs text-muted">
                카드를 클릭하면 상세 메뉴·카카오맵 링크를 볼 수 있고, 마음에 드는 곳은 바로 코스에 담아보세요.
              </p>
            </div>
          </div>

          {isLoadingPlaces ? (
            <div className="flex min-h-60 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="mt-3 text-xs font-bold text-muted">
                주변 핫플 데이터를 탐색하고 있어요...
              </p>
            </div>
          ) : searchError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center">
              <p className="text-sm font-bold text-red-600">{searchError}</p>
              <button
                type="button"
                onClick={triggerReload}
                className="mt-3 rounded-full bg-surface-dark px-4 py-2 text-xs font-bold text-white"
              >
                다시 시도
              </button>
            </div>
          ) : places.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-10 text-center">
              <p className="text-sm font-extrabold text-foreground">
                조건에 맞는 주변 장소가 아직 없어요.
              </p>
              <p className="mt-1 text-xs text-muted">
                예산 상한을 넓히거나 다른 역·동네 키워드로 검색해 보세요!
              </p>
            </div>
          ) : (
            places.map((spot, idx) => {
              const isSelected = draftIdSet.has(spot.id);
              return (
                <article
                  key={spot.id}
                  className={`group rounded-3xl border bg-surface p-5 transition-all sm:p-6 ${
                    isSelected
                      ? "border-primary shadow-[0_8px_28px_rgba(232,93,63,0.10)]"
                      : "border-line hover:border-primary/40"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      onClick={() => void handleOpenDetail(spot)}
                      className="space-y-1.5 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-black text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          {CATEGORY_BADGE_LABELS[spot.categoryGroup]}
                          {spot.foodCategory ? ` · ${spot.foodCategory}` : ""}
                        </span>
                        {spot.isIndoor !== null && (
                          <span className="rounded-md bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">
                            {spot.isIndoor ? "실내" : "야외"}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold text-foreground group-hover:text-primary">
                        {spot.name}
                      </h3>
                      <p className="text-xs font-medium text-muted">
                        {spot.address} ·{" "}
                        {spot.avgPricePerPerson !== null ? (
                          <strong className="text-foreground">
                            {spot.avgPricePerPerson === 0
                              ? "무료"
                              : `1인 약 ${spot.avgPricePerPerson.toLocaleString()}원`}
                          </strong>
                        ) : (
                          <span className="rounded-md bg-surface-subtle px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                            가격 미확인
                          </span>
                        )}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleDraft(spot)}
                      className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-4 py-2 text-xs font-extrabold transition-colors ${
                        isSelected
                          ? "bg-surface-dark text-white"
                          : "border border-line bg-background text-foreground hover:border-primary hover:bg-primary-soft hover:text-primary"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-amber-300" />
                          <span>코스에 담김</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>코스에 담기</span>
                        </>
                      )}
                    </button>
                  </div>

                  {spot.aiSummary && (
                    <div className="mt-3.5 rounded-2xl bg-surface-subtle/75 px-4 py-2.5 text-xs leading-relaxed text-foreground/85">
                      <span className="mr-1.5 font-bold text-primary">
                        ✦ 요약
                      </span>
                      {spot.aiSummary}
                    </div>
                  )}

                  {spot.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {spot.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Right: Dynamic Route / Spot Map ([F-05] Google Maps JS + Vector Fallback) */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24">
            <CourseRouteMap
              stops={mapStops}
              connectRoute={draftPlaces.length >= 2}
              headerTitle={
                draftPlaces.length >= 2
                  ? `내가 담은 동선 (${draftPlaces.length}곳)`
                  : `'${appliedKeyword}' 스팟 분포 프리뷰`
              }
              onSelectStop={(stop) => {
                const found =
                  draftPlaces.find((p) => p.id === stop.id) ??
                  places.find((p) => p.id === stop.id);
                if (found) {
                  void handleOpenDetail(found);
                }
              }}
              footerNode={
                draftPlaces.length > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-foreground">
                      담은 {draftPlaces.length}곳 · 2인 약{" "}
                      {totalDraftCostForTwo.toLocaleString()}원
                    </span>
                    <Link
                      href="/courses/new"
                      className="font-extrabold text-primary hover:underline"
                    >
                      코스 메이커로 이동 →
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted">
                    장소 카드에서{" "}
                    <strong className="text-foreground">+ 코스에 담기</strong>를
                    누르면 방문 순서대로 동선이 연결됩니다.
                  </p>
                )
              }
            />
          </div>
        </aside>
      </section>

      {activePlaceDetail && (
        <PlaceDetailModal
          place={activePlaceDetail}
          isSelectedInDraft={draftIdSet.has(activePlaceDetail.id)}
          onToggleDraft={handleToggleDraft}
          onClose={() => setActivePlaceDetail(null)}
        />
      )}
    </div>
  );
}
