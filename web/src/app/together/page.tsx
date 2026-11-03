import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Flame,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

const TODAY_MISSIONS = [
  {
    id: 1,
    title: "오늘 마신 음료 두 잔 나란히 사진 남기기",
    reward: "+15 XP",
    completed: true,
  },
  {
    id: 2,
    title: "함께 짠 데이트 코스 첫 경유지 방문 체크인",
    reward: "+20 XP",
    completed: false,
  },
  {
    id: 3,
    title: "집으로 돌아가는 길에 세 줄 데이트 일기 남기기",
    reward: "+25 XP",
    completed: false,
  },
];

export default function TogetherPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary">
            COUPLE LOUNGE
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            만날수록 자라나는 우리 둘의 스페이스
          </h1>
          <p className="mt-1 text-sm text-muted">
            데이트 체크인과 작은 미션으로 커플 펫을 키우고 함께 쌓은 시간을 기록해요.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary-soft px-4 py-2 text-xs font-extrabold text-primary sm:self-auto">
          <Flame className="h-4 w-4" />
          <span>누적 데이트 6회 · 연속 달성 중</span>
        </div>
      </header>

      {/* Bento Grid: Left Dark Espresso Pet Stage + Right Invite & Missions */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Pet Character Card */}
        <div className="flex flex-col justify-between rounded-[28px] bg-surface-dark p-6 text-white shadow-lg sm:p-8 lg:col-span-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              LEVEL 02 · 아기 삐약이
            </span>
            <span className="text-xs font-semibold text-white/65">
              다음 진화까지 32 XP
            </span>
          </div>

          <div className="my-8 flex flex-col items-center text-center">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-primary/30 via-white/10 to-amber-300/30 text-6xl ring-1 ring-white/20">
              🐣
            </div>
            <h2 className="mt-4 text-xl font-black">
              &ldquo;이번 주말엔 어디로 데이트 가나요?&rdquo;
            </h2>
            <p className="mt-1 max-w-sm text-xs text-white/70">
              오늘 연인과 만났다면 만남 인증 버튼으로 경험치를 선물해 주세요.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex justify-between text-xs font-bold">
                <span>성장 경험치</span>
                <span className="text-amber-300">68 / 100 XP</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary to-amber-400" />
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover"
            >
              오늘의 만남 인증하기 (+15 XP)
            </button>
          </div>
        </div>

        {/* Right Stacked Bento Cards */}
        <div className="flex flex-col gap-6 lg:col-span-6">
          {/* Couple Invite Ticket */}
          <article className="rounded-[28px] border border-line bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                  <HeartHandshake className="h-4 w-4" />
                  <span>연인 연결 · 초대 코드</span>
                </div>
                <h3 className="mt-1 text-base font-extrabold text-foreground">
                  6자리 코드로 코스와 일기장을 연결하세요
                </h3>
                <p className="mt-1 text-xs text-muted">
                  연결 즉시 보관함의 공유 코스와 펫 상태가 실시간으로 동기화됩니다.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 px-4 py-3">
              <span className="font-mono text-base font-black tracking-[0.25em] text-foreground">
                DAY729
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground shadow-2xs hover:bg-surface-subtle"
              >
                <Copy className="h-3.5 w-3.5 text-primary" />
                <span>코드 복사</span>
              </button>
            </div>
          </article>

          {/* Daily Date Missions */}
          <article className="flex-1 rounded-[28px] border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground">
                오늘의 데이트 미션
              </h3>
              <Link
                href="/diaries"
                className="text-xs font-bold text-primary hover:underline"
              >
                일기장 바로가기 →
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {TODAY_MISSIONS.map((mission) => (
                <div
                  key={mission.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                    mission.completed
                      ? "border-primary/25 bg-primary-soft/40"
                      : "border-line bg-background"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        mission.completed ? "text-primary" : "text-muted/40"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        mission.completed
                          ? "text-foreground/70 line-through"
                          : "text-foreground"
                      }`}
                    >
                      {mission.title}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-extrabold text-primary">
                    {mission.reward}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
