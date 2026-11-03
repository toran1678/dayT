import Link from "next/link";
import {
  Clock,
  CloudSun,
  MapPin,
  Plus,
  Search,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type {
  DateTheme,
  FoodCategory,
  PlaceCategoryGroup,
} from "@/shared/api/types";

const DATE_THEMES: DateTheme[] = [
  "감성 카페",
  "맛집 투어",
  "전시·문화",
  "액티비티",
  "산책·야외",
  "어디든",
];

const FOOD_CATEGORIES: FoodCategory[] = [
  "일식",
  "양식",
  "한식",
  "고기",
  "중식",
  "분식",
];

const CATEGORY_TABS: { code: PlaceCategoryGroup; label: string }[] = [
  { code: "RESTAURANT", label: "식당·다이닝" },
  { code: "CAFE", label: "로스터리·카페" },
  { code: "EXHIBITION", label: "전시·소품샵" },
  { code: "ACTIVITY", label: "공방·액티비티" },
  { code: "PARK", label: "산책·야경" },
];

const CURATED_SPOTS = [
  {
    order: 1,
    name: "연무장 카츠 & 소바",
    categoryLabel: "일식 · 다이닝",
    address: "성수역 4번 출구 도보 4분",
    avgPrice: "1인 18,000원",
    indoor: "실내 쾌적",
    aiSummary:
      "바삭한 등심카츠와 냉소바 조합이 깔끔해 데이트 첫 식사로 웨이팅 대비 만족도가 높아요.",
    tags: ["#첫끼추천", "#바테이블좌석", "#깔끔한분위기"],
  },
  {
    order: 2,
    name: "서울숲 그라운드 전시관",
    categoryLabel: "전시 · 문화",
    address: "식당에서 도보 8분 이동",
    avgPrice: "1인 15,000원",
    indoor: "비 오는 날 추천",
    aiSummary:
      "식사 후 가볍게 걸어가 관람하기 좋은 미디어 전시로 사진 남기기 좋은 포토존이 많아요.",
    tags: ["#실내데이트", "#포토존", "#대화거리풍부"],
  },
  {
    order: 3,
    name: "성수 햇살 로스터리",
    categoryLabel: "카페 · 디저트",
    address: "전시관에서 도보 6분 이동",
    avgPrice: "1인 12,000원",
    indoor: "통창 채광",
    aiSummary:
      "오후 4시쯤 노을빛이 들어오는 2층 창가석이 인기이며 필터 커피와 무화과 타르트가 유명해요.",
    tags: ["#노을맛집", "#수제디저트", "#조용한대화"],
  },
];

export default function ExplorePage() {
  return (
    <div className="space-y-8">
      {/* Editorial Hero + Multi-Segment Concierge Search Bar */}
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-[0_12px_40px_rgba(24,24,27,0.04)] sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-amber-300/15 blur-3xl"
        />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>오늘의 동선까지 계산하는 데이트 컨시어지</span>
            </div>
            <h1 className="text-2xl leading-tight font-black tracking-tight text-foreground sm:text-4xl">
              식당 찾고, 카페 또 검색하는 수고 없이{" "}
              <span className="text-primary">하루 코스를 한 번에.</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted sm:text-base">
              만날 역과 예산만 고르면 실제 주변 핫플 데이터를 바탕으로 이동 거리까지 자연스러운 데이트 루트를 완성해 드립니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DATE_THEMES.map((theme, idx) => (
              <span
                key={theme}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${idx === 0
                    ? "bg-surface-dark text-white"
                    : "border border-line bg-background text-muted hover:text-foreground"
                  }`}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>

        {/* Multi-Segment Concierge Bar (Airbnb / CatchTable Style) */}
        <div className="relative mt-7 grid gap-2 rounded-2xl border border-line bg-background p-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-center lg:rounded-full lg:p-2">
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 lg:col-span-3">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted">만날 지역 · 역</p>
              <p className="truncate text-sm font-bold text-foreground">
                성수역 · 서울숲
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border-t border-line/70 px-4 py-2.5 sm:border-t-0 sm:border-l lg:col-span-3">
            <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted">음식 취향</p>
              <p className="truncate text-sm font-bold text-foreground">
                {FOOD_CATEGORIES.slice(0, 3).join(" · ")} 추천
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border-t border-line/70 px-4 py-2.5 lg:col-span-3 lg:border-t-0 lg:border-l">
            <Wallet className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted">1인 예산 · 시간</p>
              <p className="truncate text-sm font-bold text-foreground">
                45,000원 · 반나절
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:col-span-3 lg:justify-end">
            <Link
              href="/courses/new"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-hover lg:rounded-full"
            >
              <Search className="h-4 w-4" />
              <span>맞춤 코스 추천받기</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Category Filter Strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className="shrink-0 rounded-full bg-surface-dark px-4 py-2 text-xs font-bold text-white"
          >
            추천 루트 전체
          </button>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.code}
              type="button"
              className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-muted md:inline-flex">
          <CloudSun className="h-4 w-4 text-primary" />
          <span>실내·우천 대비 필터 지원 예정</span>
        </span>
      </div>

      {/* Main Split View: Editorial Spot Cards (Left) + Visual Route Map Canvas (Right) */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                성수역 반경 1.2km 큐레이션 스팟
              </h2>
              <p className="text-xs text-muted">
                AI 리뷰 요약 해시태그와 예상 1인 비용을 한눈에 비교하고 코스에 담아보세요.
              </p>
            </div>
          </div>

          {CURATED_SPOTS.map((spot) => (
            <article
              key={spot.order}
              className="group rounded-3xl border border-line bg-surface p-5 transition-all hover:border-primary/40 hover:shadow-[0_8px_28px_rgba(232,93,63,0.08)] sm:p-6"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                      {spot.order}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {spot.categoryLabel}
                    </span>
                    <span className="text-muted/40">·</span>
                    <span className="rounded-md bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">
                      {spot.indoor}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-foreground group-hover:text-primary">
                    {spot.name}
                  </h3>
                  <p className="text-xs font-medium text-muted">
                    {spot.address} · <strong className="text-foreground">{spot.avgPrice}</strong>
                  </p>
                </div>

                <Link
                  href="/courses/new"
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-line bg-background px-4 py-2 text-xs font-bold text-foreground transition-colors group-hover:border-primary group-hover:bg-primary-soft group-hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>코스에 담기</span>
                </Link>
              </div>

              {/* AI One-line Summary Callout */}
              <div className="mt-4 rounded-2xl bg-surface-subtle/75 px-4 py-3 text-xs leading-relaxed text-foreground/85">
                <span className="mr-1.5 font-bold text-primary">✦ AI 요약</span>
                {spot.aiSummary}
              </div>

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {spot.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Visual Styled Route Map Preview (F-05, F-12) */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_12px_36px_rgba(24,24,27,0.05)]">
            {/* Map Top Floating Overlay */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-xs font-extrabold text-foreground">
                  실시간 동선 프리뷰 맵
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                <Clock className="h-3 w-3" />총 도보 14분
              </span>
            </div>

            {/* Stylized Map Illustration Canvas */}
            <div className="relative h-80 bg-[#F4F1EA] p-6 lg:h-[420px]">
              {/* Subtle Map Roads & River SVG */}
              <svg
                viewBox="0 0 400 400"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <path
                  d="M0 90 Q160 110 400 60"
                  stroke="#E7E2D8"
                  strokeWidth="18"
                  fill="none"
                />
                <path
                  d="M80 0 L130 400"
                  stroke="#E7E2D8"
                  strokeWidth="14"
                  fill="none"
                />
                <path
                  d="M0 280 L400 220"
                  stroke="#E7E2D8"
                  strokeWidth="22"
                  fill="none"
                />
                <path
                  d="M270 0 L240 400"
                  stroke="#EBE7DF"
                  strokeWidth="10"
                  fill="none"
                />
                {/* Route Polyline 1 -> 2 -> 3 */}
                <path
                  d="M95 115 L215 195 L295 300"
                  stroke="#E85D3F"
                  strokeWidth="4"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* Pin 1 */}
              <div className="absolute top-[22%] left-[16%] flex items-center gap-2 rounded-full bg-surface-dark px-3 py-1.5 text-xs font-bold text-white shadow-md">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px]">
                  1
                </span>
                <span>연무장 카츠</span>
              </div>

              {/* Pin 2 */}
              <div className="absolute top-[43%] left-[42%] flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground shadow-md ring-2 ring-primary">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">
                  2
                </span>
                <span>서울숲 전시</span>
              </div>

              {/* Pin 3 */}
              <div className="absolute top-[69%] left-[56%] flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground shadow-md ring-1 ring-line">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">
                  3
                </span>
                <span>햇살 로스터리</span>
              </div>

              {/* Bottom Glass Caption */}
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/60 bg-surface/90 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    2인 예상 총액 90,000원
                  </span>
                  <Link
                    href="/courses/new"
                    className="font-bold text-primary hover:underline"
                  >
                    이 루트로 편집하기 →
                  </Link>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Phase 2에서 실제 Google Maps JS API 커스텀 테마 지도가 연결됩니다.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
