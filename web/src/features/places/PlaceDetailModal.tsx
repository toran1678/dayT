"use client";

import {
  Check,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { PlaceCategoryGroup, PlaceDetail } from "@/shared/api/types";

const CATEGORY_KO_LABELS: Record<PlaceCategoryGroup, string> = {
  RESTAURANT: "식당 · 다이닝",
  CAFE: "로스터리 · 카페",
  EXHIBITION: "전시 · 문화",
  ACTIVITY: "공방 · 액티비티",
  PARK: "공원 · 산책",
  ETC: "기타 스팟",
};

interface PlaceDetailModalProps {
  place: PlaceDetail;
  isSelectedInDraft: boolean;
  onToggleDraft: (place: PlaceDetail) => void;
  onClose: () => void;
}

export function PlaceDetailModal({
  place,
  isSelectedInDraft,
  onToggleDraft,
  onClose,
}: PlaceDetailModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
    >
      <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            {CATEGORY_KO_LABELS[place.categoryGroup]}
          </span>
          {place.foodCategory && (
            <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-bold text-foreground">
              {place.foodCategory}
            </span>
          )}
          {place.isIndoor !== null && (
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-muted">
              {place.isIndoor ? "실내 공간" : "야외 산책"}
            </span>
          )}
        </div>

        <h2
          id="place-detail-title"
          className="mt-3 text-2xl font-black tracking-tight text-foreground"
        >
          {place.name}
        </h2>
        {place.subCategory && (
          <p className="mt-0.5 text-xs font-semibold text-muted">
            {place.subCategory}
          </p>
        )}

        <div className="mt-4 space-y-2 rounded-2xl bg-background p-4 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-medium text-foreground">{place.address}</span>
          </div>
          {place.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-muted">{place.phone}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <span className="text-muted">1인 평균 가격</span>
            <strong className="font-extrabold text-foreground">
              {place.avgPricePerPerson === null
                ? "가격 미확인"
                : place.avgPricePerPerson === 0
                  ? "무료"
                  : `약 ${place.avgPricePerPerson.toLocaleString()}원`}
            </strong>
          </div>
        </div>

        {place.aiSummary && (
          <div className="mt-4 rounded-2xl bg-primary-soft/55 p-4 text-xs leading-relaxed text-foreground">
            <div className="mb-1 inline-flex items-center gap-1 font-extrabold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI 큐레이션 한 줄 요약</span>
            </div>
            <p>{place.aiSummary}</p>
          </div>
        )}

        {place.recommendedMenus.length > 0 && (
          <div className="mt-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold text-foreground">
              <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
              <span>추천 메뉴 · 프로그램</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {place.recommendedMenus.map((menu) => (
                <span
                  key={menu}
                  className="rounded-xl border border-line bg-background px-3 py-1 text-xs font-semibold text-foreground"
                >
                  {menu}
                </span>
              ))}
            </div>
          </div>
        )}

        {place.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {place.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-4">
          {place.placeUrl ? (
            <a
              href={place.placeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-surface-subtle"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <span>카카오맵 상세보기</span>
            </a>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={() => onToggleDraft(place)}
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-extrabold transition-colors ${
              isSelectedInDraft
                ? "bg-surface-dark text-white"
                : "bg-primary text-white hover:bg-primary-hover"
            }`}
          >
            {isSelectedInDraft ? (
              <>
                <Check className="h-4 w-4 text-amber-300" />
                <span>코스에 담김 (빼기)</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>내 코스에 담기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

