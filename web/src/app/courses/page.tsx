import Link from "next/link";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";

const SAVED_COURSES = [
  {
    id: 1,
    badge: "AI 추천 확정",
    title: "성수동 오후 감성 전시 & 로스터리 루트",
    themes: ["감성 카페", "전시·문화"],
    stops: ["연무장 카츠", "서울숲 전시관", "성수 햇살 로스터리"],
    duration: "3시간 54분",
    cost: "2인 90,000원",
    sharedWithPartner: true,
  },
  {
    id: 2,
    badge: "직접 제작",
    title: "연남동 골목 일식 & 경의선숲길 노을 산책",
    themes: ["맛집 투어", "산책·야외"],
    stops: ["연남 텐동집", "소품샵 투어", "경의선숲길", "와인바 무드"],
    duration: "4시간 30분",
    cost: "2인 108,000원",
    sharedWithPartner: false,
  },
];

export default function MyCoursesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary">
            SAVED PASSES
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            내 코스와 커플 공유 패스
          </h1>
          <p className="mt-1 text-sm text-muted">
            완성한 코스를 카톡 썸네일 링크로 보내거나, 당일 스마트폰 구글맵 경유지 길안내로 바로 실행하세요.
          </p>
        </div>

        <Link
          href="/courses/new"
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>새 코스 만들기</span>
        </Link>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {SAVED_COURSES.map((course) => (
          <article
            key={course.id}
            className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-6 shadow-[0_8px_24px_rgba(24,24,27,0.03)] transition-all hover:border-primary/40"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
                  <Sparkles className="h-3 w-3" />
                  {course.badge}
                </span>
                {course.sharedWithPartner && (
                  <span className="rounded-full bg-surface-dark px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                    ♥ 커플 공유됨
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-lg font-extrabold text-foreground">
                {course.title}
              </h2>

              {/* Ticket Route Flow */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-background p-3.5 text-xs font-bold text-foreground">
                {course.stops.map((stop, idx) => (
                  <span key={stop} className="inline-flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-black text-primary">
                      {idx + 1}
                    </span>
                    <span>{stop}</span>
                    {idx < course.stops.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted" />
                    )}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{course.themes.map((t) => `#${t}`).join(" ")}</span>
                <span className="font-semibold text-foreground">
                  {course.duration} · {course.cost}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-line pt-4">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-3.5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                <ExternalLink className="h-3.5 w-3.5 text-amber-300" />
                <span>구글맵 길안내</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-subtle"
              >
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span>카톡 공유</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-subtle"
              >
                <Download className="h-3.5 w-3.5 text-muted" />
                <span>KML</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
