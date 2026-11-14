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
  Calendar,
  ChefHat,
  CloudRain,
  Coffee,
  Compass,
  Drumstick,
  Fish,
  Flame,
  MapPin,
  Palette,
  PartyPopper,
  Pizza,
  RotateCcw,
  Sandwich,
  Search,
  Soup,
  Sparkles,
  Ticket,
  TrainFront,
  Trash2,
  Trees,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { ApiError } from "@/shared/api/client";
import type {
  FoodCategory,
  PlaceCategoryGroup,
  PlaceDetail,
} from "@/shared/api/types";
import {
  CourseRouteMap,
  getStopCategoryVisual,
  type MapAreaSearchRequest,
  type RouteMapStop,
} from "@/features/map/CourseRouteMap";
import { useDraftPlaces, writeDraftPlaces } from "./draft-course-storage";
import { PlaceSpotlightCard } from "./PlaceSpotlightCard";
import { searchPlacesApi } from "./places-api";
import {
  searchSubwayStations,
  type SubwayStationHint,
} from "./subway-search-data";

// Multi-selectable date spot categories with dedicated Lucide SVG icons and fixed 1px border geometry
export type ExploreCategoryCode = PlaceCategoryGroup | "FESTIVAL";

const CATEGORY_MULTI_FILTERS: {
  code: ExploreCategoryCode;
  label: string;
  icon: typeof Coffee;
  color: string;
  activeBorder: string;
  activeBg: string;
}[] = [
    {
      code: "CAFE",
      label: "감성 카페",
      icon: Coffee,
      color: "#B45309",
      activeBorder: "border-amber-600",
      activeBg: "bg-amber-600",
    },
    {
      code: "RESTAURANT",
      label: "맛집 투어",
      icon: UtensilsCrossed,
      color: "#E11D48",
      activeBorder: "border-rose-600",
      activeBg: "bg-rose-600",
    },
    {
      code: "ACTIVITY",
      label: "액티비티",
      icon: Ticket,
      color: "#4F46E5",
      activeBorder: "border-indigo-600",
      activeBg: "bg-indigo-600",
    },
    {
      code: "EXHIBITION",
      label: "전시·문화",
      icon: Palette,
      color: "#9333EA",
      activeBorder: "border-purple-600",
      activeBg: "bg-purple-600",
    },
    {
      code: "PARK",
      label: "산책·야외",
      icon: Trees,
      color: "#059669",
      activeBorder: "border-emerald-600",
      activeBg: "bg-emerald-600",
    },
    {
      code: "FESTIVAL",
      label: "행사·축제",
      icon: PartyPopper,
      color: "#DB2777",
      activeBorder: "border-pink-600",
      activeBg: "bg-pink-600",
    },
  ];

// Multi-selectable food categories styled identically to main categories with matching Lucide SVG icons
const FOOD_MULTI_FILTERS: {
  category: FoodCategory;
  label: string;
  icon: typeof UtensilsCrossed;
  color: string;
  activeBorder: string;
  activeBg: string;
}[] = [
    {
      category: "일식",
      label: "일식",
      icon: Fish,
      color: "#0284C7",
      activeBorder: "border-sky-600",
      activeBg: "bg-sky-600",
    },
    {
      category: "양식",
      label: "양식",
      icon: Pizza,
      color: "#D97706",
      activeBorder: "border-amber-600",
      activeBg: "bg-amber-600",
    },
    {
      category: "한식",
      label: "한식",
      icon: Soup,
      color: "#DC2626",
      activeBorder: "border-red-600",
      activeBg: "bg-red-600",
    },
    {
      category: "고기",
      label: "고기",
      icon: Flame,
      color: "#EA580C",
      activeBorder: "border-orange-600",
      activeBg: "bg-orange-600",
    },
    {
      category: "중식",
      label: "중식",
      icon: UtensilsCrossed,
      color: "#B91C1C",
      activeBorder: "border-red-700",
      activeBg: "bg-red-700",
    },
    {
      category: "치킨",
      label: "치킨",
      icon: Drumstick,
      color: "#CA8A04",
      activeBorder: "border-yellow-600",
      activeBg: "bg-yellow-600",
    },
    {
      category: "분식",
      label: "분식",
      icon: Sandwich,
      color: "#DB2777",
      activeBorder: "border-pink-600",
      activeBg: "bg-pink-600",
    },
    {
      category: "기타",
      label: "기타",
      icon: ChefHat,
      color: "#8B5CF6",
      activeBorder: "border-purple-600",
      activeBg: "bg-purple-600",
    },
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
  // Input field starts empty as requested by user, while default search region is "성수역"
  const [keywordInput, setKeywordInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("성수역");
  const [appliedCoords, setAppliedCoords] = useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);

  // Subway station autocomplete hints dropdown state
  const [isSearchHintOpen, setIsSearchHintOpen] = useState(false);
  const [searchHints, setSearchHints] = useState<SubwayStationHint[]>([]);
  const [activeHintIdx, setActiveHintIdx] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const [mapPreviewMode, setMapPreviewMode] = useState<"places" | "draft">(
    "places",
  );

  // Multi-category selection state (empty array = all categories)
  const [selectedCategories, setSelectedCategories] = useState<
    ExploreCategoryCode[]
  >([]);

  // Multi-food-category selection state for restaurants (empty array = all food types)
  const [selectedFoodCategories, setSelectedFoodCategories] = useState<
    FoodCategory[]
  >([]);

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
  const [allFestivals, setAllFestivals] = useState<PlaceDetail[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Spotlight active selected spot & modal window state
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);

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

  // Load active festivals nationwide so they are always visible in list & details
  useEffect(() => {
    let active = true;
    async function loadAllFestivals() {
      try {
        const res = await fetch("/api/v1/places/festivals?limit=500");
        if (!res.ok) return;
        const items = (await res.json()) as PlaceDetail[];
        if (active && Array.isArray(items)) {
          setAllFestivals(items);
        }
      } catch {
        // Non-blocking fallback
      }
    }
    void loadAllFestivals();
    return () => {
      active = false;
    };
  }, [reloadTick]);

  // Search Places API Effect with consistent candidate pool (size: 40)
  useEffect(() => {
    let active = true;

    async function loadPlaces() {
      try {
        const backendCategory =
          selectedCategories.length === 1 && selectedCategories[0] !== "FESTIVAL"
            ? (selectedCategories[0] as PlaceCategoryGroup)
            : undefined;
        // Consistent pool of 40 candidates to avoid sudden list-size jumps when selecting food types
        const backendSize = 40;

        const effectiveRadiusMeters = selectedCategories.includes("FESTIVAL")
          ? Math.max(radiusMeters, 10000)
          : radiusMeters;

        const res = await searchPlacesApi({
          keyword: appliedCoords ? undefined : appliedKeyword,
          latitude: appliedCoords?.latitude,
          longitude: appliedCoords?.longitude,
          radiusMeters: effectiveRadiusMeters,
          categoryGroup: backendCategory,
          maxPricePerPerson: maxPrice,
          isIndoor: indoorOnly ? true : undefined,
          page: 0,
          size: backendSize,
        });

        if (active) {
          let filtered = res.items;
          const todayStr = new Date().toISOString().slice(0, 10);

          // 0. Exclude past events (endDate < today)
          filtered = filtered.filter(
            (p) => !p.eventEndDate || p.eventEndDate >= todayStr,
          );

          // 1. Filter by major categories / festival
          if (selectedCategories.length > 0) {
            const hasFestival = selectedCategories.includes("FESTIVAL");
            const standardCats = selectedCategories.filter(
              (c): c is PlaceCategoryGroup => c !== "FESTIVAL",
            );

            filtered = filtered.filter((p) => {
              const isFestivalSpot = Boolean(
                p.eventStartDate && p.eventEndDate && p.eventEndDate >= todayStr,
              );
              const matchFestival = hasFestival && isFestivalSpot;
              const matchStandard =
                standardCats.length > 0 &&
                standardCats.includes(p.categoryGroup);
              return matchFestival || matchStandard;
            });

            // When festival is selected, merge active festivals so the list view is fully populated
            if (hasFestival && allFestivals.length > 0) {
              const existingIds = new Set(filtered.map((p) => p.id));
              const extraFests = allFestivals.filter(
                (f) => !existingIds.has(f.id),
              );
              filtered = [...filtered, ...extraFests];
            }
          }

          // 2. Filter by food categories if specified (narrows down restaurants from the 40 places)
          if (selectedFoodCategories.length > 0) {
            filtered = filtered.filter((p) => {
              if (p.categoryGroup === "RESTAURANT") {
                const matchCategory =
                  p.foodCategory &&
                  selectedFoodCategories.includes(p.foodCategory);
                const matchSub =
                  p.subCategory &&
                  selectedFoodCategories.some((fc) =>
                    p.subCategory?.includes(fc),
                  );
                return Boolean(matchCategory || matchSub);
              }
              // If only RESTAURANT category is selected, non-restaurants are excluded
              if (
                selectedCategories.length === 1 &&
                selectedCategories[0] === "RESTAURANT"
              ) {
                return false;
              }
              return true;
            });
          }

          setPlaces(filtered);
          setSearchError(null);
          if (filtered.length > 0) {
            setSelectedPlaceId((prev) => {
              const stillExists = filtered.some((p) => p.id === prev);
              return stillExists ? prev : filtered[0].id;
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
    selectedCategories,
    selectedFoodCategories,
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
    const nextKw = keywordInput.trim() || appliedKeyword || "성수역";
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

  // Category Multi-toggle Handlers
  function handleToggleCategory(code: ExploreCategoryCode) {
    setIsLoadingPlaces(true);
    setSelectedCategories((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  }

  function handleSelectAllCategories() {
    setIsLoadingPlaces(true);
    setSelectedCategories([]);
    setSelectedFoodCategories([]);
  }

  // Food Subcategory Multi-toggle Handlers
  function handleToggleFoodCategory(fc: FoodCategory) {
    setIsLoadingPlaces(true);
    setSelectedFoodCategories((prev) => {
      if (prev.includes(fc)) {
        return prev.filter((item) => item !== fc);
      }
      return [...prev, fc];
    });
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

  function handleAddDraft(place: PlaceDetail) {
    if (!draftPlaces.some((p) => p.id === place.id)) {
      const next = [...draftPlaces, place];
      writeDraftPlaces(next);
      if (next.length >= 2) {
        setMapPreviewMode("draft");
      }
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
    // 1. Draft course places (always stay pinned on the map with category icon + course badge)
    const draftStops: RouteMapStop[] = draftPlaces.map((place, index) => ({
      id: place.id,
      order: index + 1,
      name: place.name,
      address: place.address,
      categoryLabel:
        place.eventStartDate && place.eventEndDate
          ? "행사·축제"
          : CATEGORY_BADGE_LABELS[place.categoryGroup],
      categoryGroup: place.categoryGroup,
      latitude: place.latitude,
      longitude: place.longitude,
      estimatedCost:
        place.avgPricePerPerson !== null
          ? place.avgPricePerPerson * 2
          : undefined,
      placeUrl: place.placeUrl,
      isDraft: true,
      eventStartDate: place.eventStartDate,
      eventEndDate: place.eventEndDate,
    }));

    if (isShowingDraftRoute) {
      return draftStops;
    }

    // 2. Newly explored candidate spots (excluding already drafted places)
    const draftIds = new Set(draftPlaces.map((p) => p.id));
    const candidatePlaces = places.filter((p) => !draftIds.has(p.id));

    const candidateStops: RouteMapStop[] = candidatePlaces
      .slice(0, 32)
      .map((place, index) => ({
        id: place.id,
        order: draftStops.length + index + 1,
        name: place.name,
        address: place.address,
        categoryLabel:
          place.eventStartDate && place.eventEndDate
            ? "행사·축제"
            : CATEGORY_BADGE_LABELS[place.categoryGroup],
        categoryGroup: place.categoryGroup,
        latitude: place.latitude,
        longitude: place.longitude,
        estimatedCost:
          place.avgPricePerPerson !== null
            ? place.avgPricePerPerson * 2
            : undefined,
        placeUrl: place.placeUrl,
        isDraft: false,
        eventStartDate: place.eventStartDate,
        eventEndDate: place.eventEndDate,
      }));

    // 3. All active festivals nationwide so that ANY festival inside visible map is ALWAYS rendered as a pin
    const pinnedIds = new Set([
      ...draftPlaces.map((p) => p.id),
      ...candidatePlaces.map((p) => p.id),
    ]);
    const extraFestivals = allFestivals.filter((f) => !pinnedIds.has(f.id));

    const festivalStops: RouteMapStop[] = extraFestivals.map((fest, idx) => ({
      id: fest.id,
      order: draftStops.length + candidateStops.length + idx + 1,
      name: fest.name,
      address: fest.address,
      categoryLabel: "행사·축제",
      categoryGroup: fest.categoryGroup,
      latitude: fest.latitude,
      longitude: fest.longitude,
      estimatedCost:
        fest.avgPricePerPerson !== null
          ? fest.avgPricePerPerson * 2
          : undefined,
      placeUrl: fest.placeUrl,
      isDraft: false,
      eventStartDate: fest.eventStartDate,
      eventEndDate: fest.eventEndDate,
    }));

    return [...draftStops, ...candidateStops, ...festivalStops];
  }, [places, draftPlaces, allFestivals, isShowingDraftRoute]);

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
        draftPlaces.find((p) => p.id === selectedPlaceId) ??
        allFestivals.find((p) => p.id === selectedPlaceId);
      if (found) return found;
    }
    return places[0] ?? draftPlaces[0] ?? allFestivals[0] ?? null;
  }, [selectedPlaceId, places, draftPlaces, allFestivals]);

  const activeSpotlightOrder = useMemo(() => {
    if (!activeSpotlightPlace) return undefined;
    const match = mapStops.find((s) => s.id === activeSpotlightPlace.id);
    return match?.order;
  }, [activeSpotlightPlace, mapStops]);

  return (
    <div className="h-full space-y-5">
      {/* Editorial Page Top Header (DayT Style: PLAN YOUR DAY) */}
      <header className="pt-1">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-primary uppercase">
          <span className="h-0.5 w-6 bg-primary" />
          <span>PLAN YOUR DAY</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-snug">
          오늘은 어떤 하루를 <br className="hidden sm:inline" />
          <span className="text-primary">함께 만들어 볼까요?</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-muted">
          지역과 취향, 예산을 고르면 DayT가 하루를 알차게 채워드려요.
        </p>
      </header>

      {/* 2-Column Split View: Desktop Sticky Map Layout */}
      <section className="grid gap-5 lg:grid-cols-12 items-start">
        {/* Left Side: Exploration Filter Panel (lg:col-span-5) */}
        <div className="space-y-4 lg:col-span-5 pb-6">
          {/* 1. Header & Unified Search / Category / Food / Budget Filter Card */}
          <div className="rounded-[28px] border border-line bg-surface p-5 sm:p-6 shadow-[0_10px_32px_rgba(24,24,27,0.03)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-black text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>실시간 데이트 상권 탐색</span>
                </span>
                <h2 className="mt-1.5 text-lg sm:text-xl font-black tracking-tight text-foreground truncate">
                  {activeRegionDisplay}
                </h2>
                <p className="mt-0.5 text-xs font-black text-primary">
                  {places.length > 0
                    ? `${places.length}곳 탐색됨`
                    : "데이트 스팟"}
                </p>
              </div>

              {(selectedCategories.length > 0 ||
                selectedFoodCategories.length > 0) && (
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface-subtle px-2.5 py-1 text-[11px] font-bold text-muted hover:text-foreground transition-colors mt-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>필터 초기화</span>
                  </button>
                )}
            </div>

            {/* Keyword Search Form with Empty Input Default and Subway Station Hints Dropdown */}
            <div ref={searchContainerRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-background px-3.5 py-2.5 shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <input
                    type="text"
                    value={keywordInput}
                    onFocus={() => {
                      setSearchHints(
                        searchSubwayStations(keywordInput || "성수역"),
                      );
                      setIsSearchHintOpen(true);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKeywordInput(val);
                      setSearchHints(searchSubwayStations(val || "성수역"));
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
                    <span>전국 주요 역 및 데이트 상권 추천 검색</span>
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
                          className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${isFocused
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

            {/* Category Multi-Selection & Differentiated Indoor Toggle Switch */}
            <div className="border-t border-line/70 pt-3 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-muted">
                  카테고리 선택 (복수 선택 가능)
                </span>

                {/* Differentiated Indoor Toggle Switch (스위치 형태의 명확한 차별화) */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={indoorOnly}
                  onClick={() => {
                    setIsLoadingPlaces(true);
                    setIndoorOnly((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border border-solid px-2.5 py-1 text-xs font-bold transition-all shadow-2xs ${indoorOnly
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                    }`}
                >
                  <CloudRain
                    className={`h-3.5 w-3.5 ${indoorOnly ? "text-primary" : "text-muted"
                      }`}
                  />
                  <span>실내 전용</span>
                  <span
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${indoorOnly ? "bg-primary" : "bg-line"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-0.5 ${indoorOnly ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                    />
                  </span>
                </button>
              </div>

              {/* 5 Distinct Categories with 100% Fixed Border Geometry (No jumping/growing on click) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* '전체' Button */}
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className={`shrink-0 rounded-full border border-solid px-3 py-1.5 text-xs font-extrabold transition-colors duration-150 shadow-2xs ${selectedCategories.length === 0
                      ? "border-surface-dark bg-surface-dark text-white"
                      : "border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                    }`}
                >
                  전체
                </button>

                {/* Major Categories: strictly identical 1px border & padding before and after selection */}
                {CATEGORY_MULTI_FILTERS.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.code);
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => handleToggleCategory(cat.code)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border border-solid px-3 py-1.5 text-xs font-extrabold transition-colors duration-150 shadow-2xs ${isSelected
                          ? `${cat.activeBorder} ${cat.activeBg} text-white`
                          : "border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                        }`}
                    >
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isSelected ? "#FFFFFF" : cat.color }}
                      />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Filter: Food Categories (Border/Background box removed, matching Category style 100%) */}
              <div className="pt-2.5 border-t border-line/60 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-muted">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-rose-500" />
                    <span>음식 종류 선택 (중복 선택 가능)</span>
                  </div>

                  <span className="text-[10px] font-medium text-muted">
                    ※ 맛집 투어 선택 시 적용
                  </span>
                </div>

                {/* Food Category Pills: identical rounded pill design with dedicated SVG icons & fixed geometry */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedFoodCategories([])}
                    className={`shrink-0 rounded-full border border-solid px-3 py-1.5 text-xs font-extrabold transition-colors duration-150 shadow-2xs ${selectedFoodCategories.length === 0
                        ? "border-surface-dark bg-surface-dark text-white"
                        : "border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                      }`}
                  >
                    음식 전체
                  </button>

                  {FOOD_MULTI_FILTERS.map((food) => {
                    const isFoodSelected =
                      selectedFoodCategories.includes(food.category);
                    const FoodIcon = food.icon;
                    return (
                      <button
                        key={food.category}
                        type="button"
                        onClick={() => handleToggleFoodCategory(food.category)}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border border-solid px-3 py-1.5 text-xs font-extrabold transition-colors duration-150 shadow-2xs ${isFoodSelected
                            ? `${food.activeBorder} ${food.activeBg} text-white`
                            : "border-line bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                          }`}
                      >
                        <FoodIcon
                          className="h-3.5 w-3.5 shrink-0"
                          style={{
                            color: isFoodSelected ? "#FFFFFF" : food.color,
                          }}
                        />
                        <span>{food.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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

          {/* 2. Draft Course Cart Panel (Always visible in clean white card styling) */}
          <div className="rounded-[28px] border border-line bg-surface p-5 sm:p-6 shadow-[0_10px_32px_rgba(24,24,27,0.03)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-foreground">
                    내가 담은 코스
                  </h3>
                  <span className="text-sm font-black text-primary">
                    {draftPlaces.length}개
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {draftPlaces.length > 0
                    ? `2인 예상 약 ${totalDraftCostForTwo.toLocaleString()}원 · 장소 클릭 시 상세 확인`
                    : "마음에 드는 장소를 클릭해 나만의 코스를 완성해보세요."}
                </p>
              </div>

              {draftPlaces.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      writeDraftPlaces([]);
                      setMapPreviewMode("places");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-muted hover:border-red-300 hover:text-red-600 transition-colors shadow-2xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>전체 취소</span>
                  </button>

                  <Link
                    href="/courses/new"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-primary-hover transition-colors"
                  >
                    <span>코스 완성</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Empty State vs Draft Spots Pill List */}
            {draftPlaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface-subtle/50 p-6 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary shadow-2xs">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="text-xs font-extrabold text-foreground">
                  아직 담은 데이트 스팟이 없습니다
                </p>
                <p className="text-[11px] text-muted leading-relaxed">
                  지도 마커나 추천 장소를 클릭해 나만의 데이트 코스를 완성해보세요.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {draftPlaces.map((dp, idx) => {
                  const visual = getStopCategoryVisual(dp.categoryGroup);
                  const CategoryIcon = visual.icon;
                  return (
                    <div
                      key={dp.id}
                      className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-2.5 text-xs font-bold text-foreground shadow-2xs hover:border-primary transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlaceId(dp.id);
                          setIsSpotlightModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-left"
                      >
                        {/* Category SVG badge with micro order tag */}
                        <span
                          style={{ backgroundColor: visual.color }}
                          className="relative flex h-5 w-5 items-center justify-center rounded-full text-white shadow-2xs shrink-0"
                        >
                          <CategoryIcon className="h-2.5 w-2.5" />
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-dark text-[8px] font-black text-white ring-1 ring-surface">
                            {idx + 1}
                          </span>
                        </span>
                        <span className="max-w-36 truncate font-bold text-foreground group-hover:text-primary transition-colors">
                          {dp.name}
                        </span>
                      </button>

                      {/* Individual Spot Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = draftPlaces.filter((p) => p.id !== dp.id);
                          writeDraftPlaces(next);
                        }}
                        title={`${dp.name} 코스에서 제거`}
                        aria-label={`${dp.name} 코스에서 제거`}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
            heightClassName="h-[520px] lg:h-[600px] min-h-[460px]"
            headerTitle={
              isShowingDraftRoute
                ? `내가 담은 코스 동선 (${draftPlaces.length}곳)`
                : `'${activeRegionDisplay}' 스팟 프리뷰 (${mapStops.length}곳)`
            }
            onSelectStop={(stop) => {
              setSelectedPlaceId(stop.id);
              setIsSpotlightModalOpen(true);
            }}
            onAddPlaceToCourse={(stop) => {
              const target: PlaceDetail = allFestivals.find((f) => f.id === stop.id) ?? {
                id: stop.id,
                externalProvider: "TOUR_API",
                externalPlaceId: `tour_${stop.id}`,
                name: stop.name,
                categoryGroup: stop.categoryGroup ?? "EXHIBITION",
                foodCategory: null,
                subCategory: stop.categoryLabel,
                address: stop.address,
                latitude: stop.latitude,
                longitude: stop.longitude,
                placeUrl: stop.placeUrl ?? null,
                eventStartDate: stop.eventStartDate ?? null,
                eventEndDate: stop.eventEndDate ?? null,
                hashtags: ["#전국축제", "#데이트"],
                avgPricePerPerson: 0,
                isIndoor: false,
                phone: null,
                thumbnailUrl: null,
                recommendedMenus: [],
                aiSummary: `${stop.name} (${stop.categoryLabel})`,
              };
              handleAddDraft(target);
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
                  지도에서 마커를 클릭하면 음식·매장 실제 사진과 상세 정보 창이 열립니다.
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsSpotlightModalOpen(false)}
        >
          <div
            className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-surface shadow-2xl [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent]"
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
