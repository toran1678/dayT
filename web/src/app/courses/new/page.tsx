import {
  Clock,
  Footprints,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { DateTheme, DateTimeSlot } from "@/shared/api/types";

const TIME_SLOTS: { code: DateTimeSlot; label: string }[] = [
  { code: "HALF_DAY", label: "반나절 (3~4시간)" },
  { code: "ALL_DAY", label: "종일 코스 (6~8시간)" },
  { code: "EVENING", label: "저녁 무드 (2~3시간)" },
];

const SELECTED_THEMES: DateTheme[] = ["감성 카페", "맛집 투어", "전시·문화"];

const TIMELINE_STEPS = [
  {
    order: 1,
    time: "13:00",
    category: "점심 식사",
    name: "연무장 카츠 & 소바",
    stayMinutes: 60,
    costForTwo: "36,000원",
    memo: "오픈 직후 방문해서 바 테이블 좌석 선점하기",
    moveNext: "도보 8분 (약 520m)",
  },
  {
    order: 2,
    time: "14:10",
    category: "실내 전시",
    name: "서울숲 그라운드 전시관",
    stayMinutes: 90,
    costForTwo: "30,000원",
    memo: "3층 미디어아트 홀 포토존 들르기",
    moveNext: "도보 6분 (약 410m)",
  },
  {
    order: 3,
    time: "15:50",
    category: "카페 · 디저트",
    name: "성수 햇살 로스터리",
    stayMinutes: 70,
    costForTwo: "24,000원",
    memo: "무화과 타르트 + 핸드드립 2잔",
    moveNext: null,
  },
];

export default function CourseBuilderPage() {
  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[11px] font-bold text-primary">
              ITINERARY STUDIO
            </span>
            {SELECTED_THEMES.map((theme) => (
              <span
                key={theme}
                className="text-xs font-semibold text-muted"
              >
                #{theme}
              </span>
            ))}
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
            성수동 오후 감성 전시 & 로스터리 루트
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40"
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>연인과 실시간 공동 편집</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
          >
            <span>코스 저장하기</span>
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Connected Vertical Itinerary Rail */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {TIME_SLOTS.map((slot, idx) => (
                <button
                  key={slot.code}
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                    idx === 0
                      ? "bg-surface-dark text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI로 저녁 코스 1곳 자동 추가</span>
            </button>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <div className="space-y-2">
              {TIMELINE_STEPS.map((step) => (
                <div key={step.order}>
                  <div className="flex gap-4">
                    {/* Left Time & Number Column */}
                    <div className="flex flex-col items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white shadow-xs">
                        {step.order}
                      </span>
                      {step.moveNext && (
                        <div className="my-1.5 w-0.5 flex-1 bg-gradient-to-b from-primary/60 to-line" />
                      )}
                    </div>

                    {/* Step Card */}
                    <div className="mb-3 flex-1 rounded-2xl border border-line bg-background p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {step.time}
                          </span>
                          <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                            {step.category}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {step.stayMinutes}분 체류 · {step.costForTwo}
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-base font-extrabold text-foreground">
                        {step.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        메모: {step.memo}
                      </p>
                    </div>
                  </div>

                  {/* Walking Transfer Connector */}
                  {step.moveNext && (
                    <div className="mb-3 ml-12 inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-[11px] font-semibold text-muted">
                      <Footprints className="h-3 w-3 text-primary" />
                      <span>{step.moveNext}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/30 py-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft/70"
            >
              <Plus className="h-4 w-4" />
              <span>다음 경유지 추가하기</span>
            </button>
          </div>
        </section>

        {/* Right: Receipt-Style Budget & Time Summary Card */}
        <aside className="space-y-4 lg:col-span-5">
          <div className="rounded-3xl bg-surface-dark p-6 text-white shadow-md">
            <p className="text-[11px] font-bold tracking-widest text-amber-300">
              ESTIMATED SUMMARY
            </p>
            <h2 className="mt-1 text-lg font-extrabold">
              예상 예산 & 소요 시간 리포트
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span>2인 총 예상 비용</span>
                </div>
                <p className="mt-1.5 text-xl font-black">90,000원</p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  1인당 약 45,000원
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                  <span>총 데이트 시간</span>
                </div>
                <p className="mt-1.5 text-xl font-black">3시간 54분</p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  체류 220분 + 도보 14분
                </p>
              </div>
            </div>

            {/* Duration Breakdown Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-[11px] text-white/75">
                <span>식사 26%</span>
                <span>전시 38%</span>
                <span>카페 30%</span>
                <span>이동 6%</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="w-[26%] bg-primary" />
                <div className="w-[38%] bg-amber-400" />
                <div className="w-[30%] bg-emerald-400" />
                <div className="w-[6%] bg-white/50" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5">
            <p className="text-xs font-extrabold text-foreground">
              동선 최적화 팁
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              현재 배치된 1 → 2 → 3 코스는 역방향 되돌아감 없이 일직선 도보 동선(총 930m)으로 설계되어 있습니다.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
