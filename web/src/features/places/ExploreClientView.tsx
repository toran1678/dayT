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
  CloudRain,
  Compass,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  TrainFront,
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
  type MapAreaSearchRequest,
  type RouteMapStop,
} from "@/features/map/CourseRouteMap";
import { useDraftPlaces, writeDraftPlaces } from "./draft-course-storage";
import { PlaceSpotlightCard } from "./PlaceSpotlightCard";
import { recommendFoodsApi, searchPlacesApi } from "./places-api";
import {
  searchSubwayStations,
  type SubwayStationHint,
} from "./subway-search-data";

const CATEGORY_FILTERS: {
  code: PlaceCategoryGroup | "ALL";
  label: string;
}[] = [
  { code: "ALL", label: "전체" },
  { code: "RESTAURANT", label: "식당" },
  { code: "CAFE", label: "카페" },
  { code: "EXHIBITION", label: "전시" },
  { code: "ACTIVITY", label: "액티비티" },
  { code: "PARK", label: "공원" },
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
  const [appliedCoords, setAppliedCoords] = useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);

  // Subway station autocomplete hints dropdown state
  const [isSearchHintOpen, setIsSearchHintOpen] = useState(false);
  const [searchHints, setSearchHints] = useState<SubwayStationHint[]>(() =>
    searchSubwayStations("성수역"),
  );
  const [activeHintIdx, setActiveHintIdx] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const [mapPreviewMode, setMapPreviewMode] = useState<"places" | "draft">(
    "places",
  );
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

  // Spotlight active selected spot & modal window state
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);

  // [F-03] Food Recommendation Widget State
  const [isFoodPanelOpen, setIsFoodPanelOpen] = useState(false);
  const [recFoodCategory, setRecFoodCategory] = useState<
    FoodCategory | undefined
  >(undefined);
  const [recBudget, setRecBudget] = useState<number | undefined>(30000);
  const [foodRecommendation, setFoodRecommendation] =
    useState<FoodRecommendationResponse | null>(null);
  const [isRecommendingFood, setIsRecommendingFood] = useState(false);
  const nextFoodCategoryIdxRef = useRef(0);

  // Draft Course Cart (Hydration-Safe)
  const draftPlaces = useDraftPlaces();
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

  // Close search hints on click outside
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

  // Search Places API Effect
  useEffect(() => {
    let active = true;

    async function loadPlaces() {
      try {
        const res = await searchPlacesApi({
          keyword: appliedCoords ? undefined : appliedKeyword,
          latitude: appliedCoords?.latitude,
          longitude: appliedCoords?.longitude,
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
          if (res.items.length > 0) {
            setSelectedPlaceId((prev) => {
              const stillExists = res.items.some((p) => p.id === prev);
              return stillExists ? prev : res.items[0].id;
            });
          }
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
    appliedCoords,
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
    setIsSearchHintOpen(false);
    const nextKw = keywordInput.trim() || "성수역";
    setIsLoadingPlaces(true);
    setSearchError(null);
    setAppliedCoords(null);
    setMapPreviewMode("places");
    if (nextKw === appliedKeyword && appliedCoords === null) {
      setReloadTick((n) => n + 1);
    } else {
      setAppliedKeyword(nextKw);
    }
  }

  function handleSelectHint(hint: SubwayStationHint) {
    setKeywordInput(hint.name);
    setIsSearchHintOpen(false);
    setIsLoadingPlaces(true);
    setSearchError(null);
    setAppliedCoords(null);
    setMapPreviewMode("places");
    if (hint.name === appliedKeyword && appliedCoords === null) {
      setReloadTick((n) => n + 1);
    } else {
      setAppliedKeyword(hint.name);
    }
  }

  function handleSearchInMapArea(area: MapAreaSearchRequest) {
    setIsLoadingPlaces(true);
    setSearchError(null);
    setMapPreviewMode("places");
    setAppliedCoords({
      latitude: area.latitude,
      longitude: area.longitude,
      label: area.areaHint ?? "현재 지도 영역",
    });
  }

  async function handleRunFoodRecommend() {
    setIsRecommendingFood(true);
    try {
      let targetCategory = recFoodCategory;
      if (!targetCategory) {
        targetCategory =
          FOOD_CATEGORIES[
            nextFoodCategoryIdxRef.current % FOOD_CATEGORIES.length
          ];
        nextFoodCategoryIdxRef.current += 1;
      }

      const anchor = places[0];
      const res = await recommendFoodsApi({
        foodCategory: targetCategory,
        latitude: appliedCoords?.latitude ?? anchor?.latitude,
        longitude: appliedCoords?.longitude ?? anchor?.longitude,
        budgetPerPerson: recBudget,
      });
      setFoodRecommendation(res);

      // If recommended places exist, update map candidates and pop open first place detail
      if (res.places.length > 0) {
        setPlaces(res.places);
        setSelectedPlaceId(res.places[0].id);
        setIsSpotlightModalOpen(true);
      }
    } catch {
      // Keep UI responsive on error
    } finally {
      setIsRecommendingFood(false);
    }
  }

  function handleToggleDraft(place: PlaceDetail) {
    const exists = draftPlaces.some((p) => p.id === place.id);
    const next = exists
      ? draftPlaces.filter((p) => p.id !== place.id)
      : [...draftPlaces, place];
    writeDraftPlaces(next);
    if (!exists && next.length >= 2) {
      setMapPreviewMode("draft");
    } else if (next.length < 2) {
      setMapPreviewMode("places");
    }
  }

  const draftIdSet = useMemo(
    () => new Set(draftPlaces.map((p) => p.id)),
    [draftPlaces],
  );

  const isShowingDraftRoute =
    mapPreviewMode === "draft" && draftPlaces.length >= 2;
  const activeRegionDisplay = appliedCoords
    ? appliedCoords.label
    : appliedKeyword;

  // Preserve drafted places on map across area searches, appending new area candidates
  const mapStops = useMemo<RouteMapStop[]>(() => {
    // 1. Draft course places (always stay pinned on the map with course order numbers)
    const draftStops: RouteMapStop[] = draftPlaces.map((place, index) => ({
      id: place.id,
      order: index + 1,
      name: place.name,
      address: place.address,
      categoryLabel: CATEGORY_BADGE_LABELS[place.categoryGroup],
      latitude: place.latitude,
      longitude: place.longitude,
      estimatedCost:
        place.avgPricePerPerson !== null
          ? place.avgPricePerPerson * 2
          : undefined,
      placeUrl: place.placeUrl,
      isDraft: true,
    }));

    if (isShowingDraftRoute) {
      return draftStops;
    }

    // 2. Newly explored candidate spots (excluding already drafted places)
    const draftIds = new Set(draftPlaces.map((p) => p.id));
    const candidatePlaces = places.filter((p) => !draftIds.has(p.id));

    const candidateStops: RouteMapStop[] = candidatePlaces
      .slice(0, 16)
      .map((place, index) => ({
        id: place.id,
        order: draftStops.length + index + 1,
        name: place.name,
        address: place.address,
        categoryLabel: CATEGORY_BADGE_LABELS[place.categoryGroup],
        latitude: place.latitude,
        longitude: place.longitude,
        estimatedCost:
          place.avgPricePerPerson !== null
            ? place.avgPricePerPerson * 2
            : undefined,
        placeUrl: place.placeUrl,
        isDraft: false,
      }));

    return [...draftStops, ...candidateStops];
  }, [places, draftPlaces, isShowingDraftRoute]);

  const totalDraftCostForTwo = useMemo(
    () =>
      draftPlaces.reduce((sum, p) => sum + (p.avgPricePerPerson ?? 0) * 2, 0),
    [draftPlaces],
  );

  // Active spotlight spot object for modal window
  const activeSpotlightPlace = useMemo(() => {
    if (selectedPlaceId !== null) {
      const found =
        places.find((p) => p.id === selectedPlaceId) ??
        draftPlaces.find((p) => p.id === selectedPlaceId);
      if (found) return found;
    }
    return places[0] ?? draftPlaces[0] ?? null;
  }, [selectedPlaceId, places, draftPlaces]);

  const activeSpotlightOrder = useMemo(() => {
    if (!activeSpotlightPlace) return undefined;
    const match = mapStops.find((s) => s.id === activeSpotlightPlace.id);
    return match?.order;
  }, [activeSpotlightPlace, mapStops]);

  return (
    <div className="h-full">
      {/* 2-Column Split View: Desktop Sticky Map Layout */}
      <section className="grid gap-5 lg:grid-cols-12 items-start">
        {/* Left Side: Exploration Filter Panel (lg:col-span-5) */}
        <div className="space-y-4 lg:col-span-5 pb-6">
          {/* 1. Header & Search Control Card */}
          <div className="rounded-[28px] border border-line bg-surface p-5 sm:p-6 shadow-[0_10px_32px_rgba(24,24,27,0.03)] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-black text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>실시간 데이트 상권 탐색</span>
                </span>
                <h1 className="mt-1.5 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                  {activeRegionDisplay}{" "}
                  <span className="text-primary">
                    {places.length > 0
                      ? `${places.length}곳 탐색됨`
                      : "데이트 스팟"}
                  </span>
                </h1>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFoodPanelOpen((prev) => !prev);
                  if (!foodRecommendation) {
                    void handleRunFoodRecommend();
                  }
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition-all ${
                  isFoodPanelOpen
                    ? "bg-primary text-white"
                    : "border border-line bg-surface-subtle text-foreground hover:border-primary/40"
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>메뉴 추천</span>
              </button>
            </div>

            {/* Keyword Search Form with Subway Station Hints Dropdown */}
            <div ref={searchContainerRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-background px-3.5 py-2.5 shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <input
                    type="text"
                    value={keywordInput}
                    onFocus={() => {
                      setSearchHints(searchSubwayStations(keywordInput));
                      setIsSearchHintOpen(true);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKeywordInput(val);
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
                        handleSelectHint(searchHints[activeHintIdx]);
                      } else if (e.key === "Escape") {
                        setIsSearchHintOpen(false);
                      }
                    }}
                    placeholder="지하철역 또는 데이트 상권 검색 (예: 성수역, 홍대, 연남동)"
                    className="w-full bg-transparent text-xs font-extrabold text-foreground outline-none placeholder:font-medium placeholder:text-muted/60"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>검색</span>
                  </button>
                </div>
              </form>

              {/* Subway Station Hints Dropdown */}
              {isSearchHintOpen && searchHints.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-primary/20 bg-surface/98 p-1.5 shadow-[0_12px_36px_rgba(24,24,27,0.12)] backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold text-muted flex items-center justify-between border-b border-line/60 mb-1">
                    <span>지하철역 추천 검색</span>
                    <span className="text-[9px] font-normal text-muted/80">
                      방향키 이동 · Enter 선택
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {searchHints.map((hint, idx) => {
                      const isFocused = idx === activeHintIdx;
                      return (
                        <button
                          key={hint.id}
                          type="button"
                          onMouseEnter={() => setActiveHintIdx(idx)}
                          onClick={() => handleSelectHint(hint)}
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
                                  hint.lines[0]?.color ?? "#0EA5E9",
                              }}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white shadow-2xs"
                            >
                              <TrainFront className="h-3 w-3" />
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
                                    backgroundColor: `${l.color}15`,
                                  }}
                                  className="rounded border px-1.5 py-0.2 text-[9px] font-bold"
                                >
                                  {l.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted shrink-0 truncate max-w-36">
                            {hint.areaHint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Radius & Budget Sliders in Compact Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Radius Slider */}
              <div className="rounded-2xl border border-line/70 bg-surface-subtle/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted">
                    <Compass className="h-3 w-3 text-primary" />
                    <span>반경</span>
                  </span>
                  <span className="font-extrabold text-primary">
                    {formatRadiusLabel(
                      RADIUS_STEPS[sliderDraftRadiusIdx] ?? 2000,
                    )}
                  </span>
                </div>
                <input
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
                  className="mt-2 h-1.5 w-full cursor-pointer accent-primary"
                />
                <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted">
                  <span>500m (최소)</span>
                  <span>10km (최대)</span>
                </div>
              </div>

              {/* Budget Slider */}
              <div className="rounded-2xl border border-line/70 bg-surface-subtle/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted">
                    <Wallet className="h-3 w-3 text-primary" />
                    <span>1인 예산</span>
                  </span>
                  <span className="font-extrabold text-primary">
                    {formatBudgetBadge(
                      sliderValueToBudget(sliderDraftPrice),
                      "예산 무관",
                    )}
                  </span>
                </div>
                <input
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
                  className="mt-2 h-1.5 w-full cursor-pointer accent-primary"
                />
                <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted">
                  <span>1만원</span>
                  <span>예산 무관</span>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs & Indoor Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
              <div className="flex items-center gap-1 overflow-x-auto">
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
                    className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${
                      selectedCategory === tab.code
                        ? "bg-surface-dark text-white"
                        : "border border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLoadingPlaces(true);
                  setIndoorOnly((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                  indoorOnly
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                <CloudRain className="h-3 w-3" />
                <span>{indoorOnly ? "실내 ON" : "실내·야외"}</span>
              </button>
            </div>

            {/* [F-03] Expandable Food Recommendation Drawer */}
            {isFoodPanelOpen && (
              <div className="rounded-2xl border border-primary/25 bg-primary-soft/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-primary">
                    오늘의 추천 메뉴 & 식당
                  </span>
                  <button
                    type="button"
                    disabled={isRecommendingFood}
                    onClick={() => void handleRunFoodRecommend()}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    {isRecommendingFood && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    <span>다시 추천</span>
                  </button>
                </div>

                {/* Food Category Quick Tabs */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRecFoodCategory(undefined)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      recFoodCategory === undefined
                        ? "bg-surface-dark text-white"
                        : "bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    자동
                  </button>
                  {FOOD_CATEGORIES.map((fc) => (
                    <button
                      key={fc}
                      type="button"
                      onClick={() => setRecFoodCategory(fc)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        recFoodCategory === fc
                          ? "bg-surface-dark text-white"
                          : "bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {fc}
                    </button>
                  ))}
                </div>

                {/* 1인 희망 예산 선택 */}
                <div className="flex items-center gap-1.5 text-[11px] pt-1">
                  <span className="font-bold text-muted">1인 예산:</span>
                  {[15000, 30000, 50000, undefined].map((b) => (
                    <button
                      key={b ?? "all"}
                      type="button"
                      onClick={() => setRecBudget(b)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                        recBudget === b
                          ? "bg-primary text-white"
                          : "border border-line bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {b ? `${b / 10000}만원` : "무관"}
                    </button>
                  ))}
                </div>

                {foodRecommendation && (
                  <div className="rounded-xl bg-surface p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-white">
                        {foodRecommendation.recommendedFoodCategory}
                      </span>
                      <strong className="font-extrabold text-foreground">
                        {foodRecommendation.recommendedSubMenu}
                      </strong>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      {foodRecommendation.reason}
                    </p>

                    {foodRecommendation.places.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {foodRecommendation.places.slice(0, 4).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedPlaceId(item.id);
                              setIsSpotlightModalOpen(true);
                            }}
                            className="flex flex-col rounded-lg border border-line bg-background p-2 text-left hover:border-primary/50 transition-colors"
                          >
                            <span className="truncate text-xs font-extrabold text-foreground">
                              {item.name}
                            </span>
                            <span className="truncate text-[10px] text-muted">
                              {item.subCategory ?? item.foodCategory}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Error Notice */}
          {searchError && (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-center">
              <p className="text-xs font-bold text-red-600">{searchError}</p>
              <button
                type="button"
                onClick={triggerReload}
                className="mt-2 rounded-full bg-surface-dark px-3 py-1 text-xs font-bold text-white"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 2. Draft Course Cart Panel (Always visible when items exist) */}
          {draftPlaces.length > 0 && (
            <div className="rounded-[24px] border border-primary/30 bg-primary-soft/40 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-foreground">
                    담은 코스 {draftPlaces.length}곳 · 2인 약{" "}
                    {totalDraftCostForTwo.toLocaleString()}원
                  </p>
                  <p className="text-[11px] text-muted">
                    장소를 클릭하면 상세 사진과 정보를 확인할 수 있습니다.
                  </p>
                </div>

                <Link
                  href="/courses/new"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-primary-hover transition-colors"
                >
                  <span>코스 완성</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Draft Spots List Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {draftPlaces.map((dp, idx) => (
                  <button
                    key={dp.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceId(dp.id);
                      setIsSpotlightModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-surface px-2.5 py-1 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-colors shadow-2xs"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">
                      {idx + 1}
                    </span>
                    <span className="max-w-28 truncate">{dp.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Large Interactive Sticky Full-Height Route & Spot Map (lg:col-span-7) */}
        <aside className="lg:col-span-7 lg:sticky lg:top-20">
          <CourseRouteMap
            stops={mapStops}
            connectRoute={isShowingDraftRoute || draftPlaces.length >= 2}
            selectedStopId={selectedPlaceId}
            searchAnchor={
              appliedCoords
                ? {
                    latitude: appliedCoords.latitude,
                    longitude: appliedCoords.longitude,
                  }
                : null
            }
            onSearchInArea={handleSearchInMapArea}
            isSearchingArea={isLoadingPlaces}
            heightClassName="h-[540px] lg:h-[calc(100vh-210px)] min-h-[500px]"
            headerTitle={
              isShowingDraftRoute
                ? `내가 담은 코스 동선 (${draftPlaces.length}곳)`
                : `'${activeRegionDisplay}' 스팟 프리뷰 (${mapStops.length}곳)`
            }
            onSelectStop={(stop) => {
              setSelectedPlaceId(stop.id);
              setIsSpotlightModalOpen(true);
            }}
            footerNode={
              draftPlaces.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground">
                      담은 {draftPlaces.length}곳 · 2인 약{" "}
                      {totalDraftCostForTwo.toLocaleString()}원
                    </span>
                    {draftPlaces.length >= 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMapPreviewMode((m) =>
                            m === "draft" ? "places" : "draft",
                          )
                        }
                        className="rounded-full border border-line bg-surface-subtle px-2 py-0.5 text-[10px] font-bold text-muted hover:text-foreground"
                      >
                        {isShowingDraftRoute
                          ? "전체 스팟 보기"
                          : "담은 동선만 보기"}
                      </button>
                    )}
                  </div>
                  <Link
                    href="/courses/new"
                    className="inline-flex items-center gap-1 font-extrabold text-primary hover:underline"
                  >
                    <span>코스 메이커로 이동</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="text-xs font-semibold text-muted">
                  지도에서 마커를 클릭하면 음식·매장 실제 사진과 상세 정보 창이
                  열립니다.
                </p>
              )
            }
          />
        </aside>
      </section>

      {/* Floating Spotlight Modal Window (창) */}
      {isSpotlightModalOpen && activeSpotlightPlace && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsSpotlightModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PlaceSpotlightCard
              place={activeSpotlightPlace}
              orderNumber={activeSpotlightOrder}
              isSelectedInDraft={draftIdSet.has(activeSpotlightPlace.id)}
              onToggleDraft={handleToggleDraft}
              onClose={() => setIsSpotlightModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
