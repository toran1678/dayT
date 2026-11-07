"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { PlaceCategoryGroup, PlaceDetail } from "@/shared/api/types";
import type { PlacePhotoItem } from "@/app/api/place-photos/route";

const CATEGORY_KO_LABELS: Record<PlaceCategoryGroup, string> = {
  RESTAURANT: "식당 · 다이닝",
  CAFE: "로스터리 · 카페",
  EXHIBITION: "전시 · 문화",
  ACTIVITY: "공방 · 액티비티",
  PARK: "공원 · 산책",
  ETC: "스팟",
};

const FALLBACK_CATEGORY_PHOTOS: Record<string, string> = {
  RESTAURANT:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  CAFE: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  EXHIBITION:
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&q=80",
  ACTIVITY:
    "https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?auto=format&fit=crop&w=800&q=80",
  PARK: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80",
  FOOD_일식:
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
  FOOD_양식:
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
  FOOD_한식:
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
  FOOD_고기:
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  ETC: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
};

interface PlaceSpotlightCardProps {
  place: PlaceDetail;
  orderNumber?: number;
  isSelectedInDraft: boolean;
  onToggleDraft: (place: PlaceDetail) => void;
  onClose?: () => void;
}

export function PlaceSpotlightCard({
  place,
  orderNumber,
  isSelectedInDraft,
  onToggleDraft,
  onClose,
}: PlaceSpotlightCardProps) {
  const [photos, setPhotos] = useState<PlacePhotoItem[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    let started = false;
    const controller = new AbortController();

    async function loadPhotos() {
      setIsLoadingPhotos(true);
      setSelectedPhotoIdx(0);
      setFailedUrls({});
      started = true;
      try {
        const params = new URLSearchParams({
          name: place.name,
          address: place.address,
          category: place.categoryGroup,
        });
        if (place.foodCategory) {
          params.set("foodCategory", place.foodCategory);
        }

        const res = await fetch(`/api/place-photos?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!active) return;

        if (res.ok) {
          const data = (await res.json()) as { photos?: PlacePhotoItem[] };
          if (active && Array.isArray(data.photos) && data.photos.length > 0) {
            setPhotos(data.photos);
            return;
          }
        }
      } catch (err: unknown) {
        if (!active || (err instanceof Error && err.name === "AbortError")) {
          return;
        }
      } finally {
        if (active) {
          setIsLoadingPhotos(false);
        }
      }
    }

    void loadPhotos();
    return () => {
      active = false;
      if (started) {
        try {
          controller.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [
    place.id,
    place.name,
    place.address,
    place.categoryGroup,
    place.foodCategory,
  ]);

  const activePhoto = photos[selectedPhotoIdx];

  // Resolve best image URL with triple-safety fallback:
  // 1. Original image URL (with referrerPolicy="no-referrer")
  // 2. Kakao thumbnail URL (always hosted on Kakao CDN, never blocked)
  // 3. Category/food curated Unsplash image
  const resolvedMainImageUrl = useMemo(() => {
    const fallbackCurated =
      (place.foodCategory
        ? FALLBACK_CATEGORY_PHOTOS[`FOOD_${place.foodCategory}`]
        : null) ??
      FALLBACK_CATEGORY_PHOTOS[place.categoryGroup] ??
      FALLBACK_CATEGORY_PHOTOS.RESTAURANT;

    if (!activePhoto) return fallbackCurated;

    if (activePhoto.url && !failedUrls[activePhoto.url]) {
      return activePhoto.url;
    }
    if (activePhoto.thumbnailUrl && !failedUrls[activePhoto.thumbnailUrl]) {
      return activePhoto.thumbnailUrl;
    }
    return fallbackCurated;
  }, [activePhoto, failedUrls, place.categoryGroup, place.foodCategory]);

  function handleMainImageError() {
    if (activePhoto) {
      if (activePhoto.url && !failedUrls[activePhoto.url]) {
        setFailedUrls((prev) => ({ ...prev, [activePhoto.url]: true }));
      } else if (
        activePhoto.thumbnailUrl &&
        !failedUrls[activePhoto.thumbnailUrl]
      ) {
        setFailedUrls((prev) => ({
          ...prev,
          [activePhoto.thumbnailUrl]: true,
        }));
      }
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-primary/25 bg-surface shadow-[0_12px_36px_rgba(232,93,63,0.12)] transition-all">
      {/* 1. Food & Store Photo Gallery Carousel */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-subtle">
        {isLoadingPhotos ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[11px] font-bold">
              가게 & 음식 사진 불러오는 중...
            </span>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <Image
              src={resolvedMainImageUrl}
              alt={`${place.name} 사진`}
              fill
              unoptimized
              referrerPolicy="no-referrer"
              onError={handleMainImageError}
              sizes="(max-width: 768px) 100vw, 560px"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
            {/* Gradient Overlay for badges readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/35" />

            {/* Left / Right Carousel Buttons */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIdx((idx) =>
                      idx > 0 ? idx - 1 : photos.length - 1,
                    );
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition hover:bg-black/85"
                  aria-label="이전 사진"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIdx((idx) =>
                      idx < photos.length - 1 ? idx + 1 : 0,
                    );
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs transition hover:bg-black/85"
                  aria-label="다음 사진"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Photo count indicator */}
            {photos.length > 1 && (
              <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                <ImageIcon className="h-3 w-3" />
                <span>
                  {selectedPhotoIdx + 1} / {photos.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {typeof orderNumber === "number" && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-black text-white shadow-sm">
                {orderNumber}
              </span>
            )}
            <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-bold text-foreground shadow-xs backdrop-blur-xs">
              {CATEGORY_KO_LABELS[place.categoryGroup]}
              {place.foodCategory ? ` · ${place.foodCategory}` : ""}
            </span>
            {place.isIndoor !== null && (
              <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                {place.isIndoor ? "실내" : "야외"}
              </span>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="창 닫기"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/90 backdrop-blur-xs"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1.1 Photo Thumbnail Strip (if multiple photos available) */}
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-surface-subtle/50 p-2">
          {photos.map((photo, idx) => {
            const thumbSrc =
              photo.thumbnailUrl && !failedUrls[photo.thumbnailUrl]
                ? photo.thumbnailUrl
                : photo.url;
            return (
              <button
                key={`${photo.url}-${idx}`}
                type="button"
                onClick={() => setSelectedPhotoIdx(idx)}
                className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-transform hover:scale-105 ${
                  selectedPhotoIdx === idx
                    ? "border-primary shadow-xs ring-1 ring-primary"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={thumbSrc}
                  alt="썸네일"
                  fill
                  unoptimized
                  referrerPolicy="no-referrer"
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Place Main Details */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight text-foreground">
              {place.name}
            </h3>
            {place.subCategory && (
              <p className="mt-0.5 text-xs font-semibold text-primary">
                {place.subCategory}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleDraft(place)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-all shadow-xs ${
              isSelectedInDraft
                ? "bg-surface-dark text-white"
                : "bg-primary text-white hover:bg-primary-hover hover:scale-105"
            }`}
          >
            {isSelectedInDraft ? (
              <>
                <Check className="h-3.5 w-3.5 text-amber-300" />
                <span>코스에 담김</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>+ 코스에 담기</span>
              </>
            )}
          </button>
        </div>

        {/* Address & Price Meta */}
        <div className="space-y-1.5 rounded-2xl bg-surface-subtle/60 p-3.5 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-medium text-foreground">{place.address}</span>
          </div>
          {place.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="text-muted">{place.phone}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line/60 pt-2 text-xs">
            <span className="text-muted">1인 예상 비용</span>
            <strong className="font-black text-foreground">
              {place.avgPricePerPerson === null
                ? "가격 미확인"
                : place.avgPricePerPerson === 0
                  ? "무료"
                  : `약 ${place.avgPricePerPerson.toLocaleString()}원`}
            </strong>
          </div>
        </div>

        {/* AI Curation Summary */}
        {place.aiSummary && (
          <div className="rounded-2xl bg-primary-soft/45 p-3.5 text-xs leading-relaxed text-foreground">
            <div className="mb-1 inline-flex items-center gap-1 font-extrabold text-primary">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>AI 데이트 큐레이션 요약</span>
            </div>
            <p className="font-medium text-foreground/90">{place.aiSummary}</p>
          </div>
        )}

        {/* Recommended Menus */}
        {place.recommendedMenus.length > 0 && (
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1 text-[11px] font-extrabold text-foreground">
              <UtensilsCrossed className="h-3 w-3 text-primary" />
              <span>추천 메뉴 · 시그니처</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {place.recommendedMenus.map((menu) => (
                <span
                  key={menu}
                  className="rounded-xl border border-line bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
                >
                  {menu}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hashtags */}
        {place.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {place.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[11px] font-semibold text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Kakao Map Detail Link */}
        {place.placeUrl && (
          <div className="pt-2 border-t border-line/70">
            <a
              href={place.placeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-line bg-background py-2.5 text-xs font-extrabold text-foreground transition-colors hover:border-primary/40 hover:bg-surface-subtle"
            >
              <span>카카오맵 상세 정보 보기</span>
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
