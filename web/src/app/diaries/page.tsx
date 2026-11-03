import { Camera, CalendarHeart, PenLine, Route } from "lucide-react";

const DIARY_ENTRIES = [
  {
    id: 1,
    dateAt: "2026. 10. 25 (일)",
    weather: "가을 햇살 맑음",
    title: "성수동 전시 보고 노을 보며 커피 마신 오후",
    content:
      "오랜만에 동선 고민 없이 코스를 미리 짜서 만났더니 이동 시간도 짧고 하루가 훨씬 여유로웠다. 전시관 3층 미디어아트도 예뻤고 로스터리 창가 자리에서 마신 필터 커피가 특히 기억에 남는 날.",
    linkedCourseTitle: "성수동 오후 감성 전시 & 로스터리 루트",
    photoLabels: ["등심카츠 첫 끼", "전시관 포토존", "노을 진 창가 라떼"],
  },
];

export default function DiariesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary">
            MEMORY JOURNAL
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            다녀온 길 위에 남기는 데이트 일기
          </h1>
          <p className="mt-1 text-sm text-muted">
            그날 걸었던 코스 동선과 사진, 둘만의 감상을 매거진처럼 차곡차곡 모아보세요.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover sm:self-auto"
        >
          <PenLine className="h-4 w-4" />
          <span>오늘의 기록 남기기</span>
        </button>
      </header>

      <div className="space-y-5">
        {DIARY_ENTRIES.map((entry) => (
          <article
            key={entry.id}
            className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(24,24,27,0.03)] sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <CalendarHeart className="h-4 w-4" />
                <span>{entry.dateAt}</span>
                <span className="text-muted/50">·</span>
                <span className="font-medium text-muted">{entry.weather}</span>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-[11px] font-bold text-foreground">
                <Route className="h-3 w-3 text-primary" />
                {entry.linkedCourseTitle}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-black text-foreground">
              {entry.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              {entry.content}
            </p>

            {/* Polaroid Photo Strip Placeholder */}
            <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-xl">
              {entry.photoLabels.map((label) => (
                <div
                  key={label}
                  className="flex aspect-4/3 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-background p-3 text-center"
                >
                  <Camera className="h-4 w-4 text-primary/70" />
                  <span className="text-[11px] font-semibold text-muted">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
