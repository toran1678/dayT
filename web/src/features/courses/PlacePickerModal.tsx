"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { searchPlacesApi } from "@/features/places/places-api";
import type { PlaceCategoryGroup, PlaceDetail } from "@/shared/api/types";

interface PlacePickerModalProps {
  existingPlaceIds: Set<number>;
  initialKeyword?: string;
  onAddPlace: (place: PlaceDetail) => void;
  onClose: () => void;
}

const CATEGORY_TABS: { code: PlaceCategoryGroup | "ALL"; label: string }[] = [
  { code: "ALL", label: "전체" },
  { code: "RESTAURANT", label: "식당" },
  { code: "CAFE", label: "카페" },
  { code: "EXHIBITION", label: "전시" },
  { code: "ACTIVITY", label: "액티비티" },
  { code: "PARK", label: "공원·산책" },
];

const PICKER_RADIUS_OPTIONS: { meters: number; label: string }[] = [
  { meters: 1000, label: "1km" },
  { meters: 2000, label: "2km" },
  { meters: 5000, label: "5km" },
  { meters: 10000, label: "10km" },
];

export function PlacePickerModal({
  existingPlaceIds,
  initialKeyword = "성수역",
  onAddPlace,
  onClose,
}: PlacePickerModalProps) {
  const [keywordInput, setKeywordInput] = useState(initialKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialKeyword);
  const [category, setCategory] = useState<PlaceCategoryGroup | "ALL">("ALL");
  const [radiusMeters, setRadiusMeters] = useState<number>(2000);
  const [items, setItems] = useState<PlaceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await searchPlacesApi({
          keyword: appliedKeyword,
          radiusMeters,
          categoryGroup: category === "ALL" ? undefined : category,
          page: 0,
          size: 20,
        });
        if (active) {
          setItems(res.items);
        }
      } catch {
        if (active) {
          setItems([]);
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
  }, [appliedKeyword, category, radiusMeters]);

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = keywordInput.trim() || "성수역";
    if (next !== appliedKeyword) {
      setIsLoading(true);
      setAppliedKeyword(next);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-primary">
              ADD WAYPOINT
            </p>
            <h2 className="text-base font-black text-foreground">
              코스에 경유지 검색 · 추가
            </h2>
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

        <div className="space-y-3 border-b border-line bg-background/60 px-6 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2">
              <Search className="h-4 w-4 text-muted" />
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="역·동네·장소명 검색 (예: 성수역, 연남동, 한남동)"
                className="w-full bg-transparent text-xs font-bold text-foreground outline-none placeholder:font-normal"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white hover:bg-primary-hover"
            >
              검색
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.code}
                  type="button"
                  onClick={() => {
                    if (category !== tab.code) {
                      setIsLoading(true);
                      setCategory(tab.code);
                    }
                  }}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                    category === tab.code
                      ? "bg-surface-dark text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-muted">반경</span>
              {PICKER_RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.meters}
                  type="button"
                  onClick={() => {
                    if (radiusMeters !== opt.meters) {
                      setIsLoading(true);
                      setRadiusMeters(opt.meters);
                    }
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    radiusMeters === opt.meters
                      ? "bg-primary text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-xs font-bold text-muted">
                주변 경유지를 불러오고 있어요...
              </p>
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-xs font-semibold text-muted">
              검색 조건에 맞는 장소가 없어요. 다른 키워드로 검색해 보세요!
            </p>
          ) : (
            items.map((place) => {
              const alreadyAdded = existingPlaceIds.has(place.id);
              return (
                <div
                  key={place.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-foreground">
                      {place.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {place.subCategory ?? place.categoryGroup} · {place.address} ·{" "}
                      {place.avgPricePerPerson !== null
                        ? place.avgPricePerPerson === 0
                          ? "무료"
                          : `1인 약 ${place.avgPricePerPerson.toLocaleString()}원`
                        : "가격 미확인"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddPlace(place)}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                      alreadyAdded
                        ? "bg-surface-dark text-white"
                        : "bg-primary text-white hover:bg-primary-hover"
                    }`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-amber-300" />
                        <span>한 번 더 추가</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>경유지 추가</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

