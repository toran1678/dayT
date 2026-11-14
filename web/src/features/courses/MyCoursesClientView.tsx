"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Clock,
  Compass,
  ExternalLink,
  Loader2,
  LogIn,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Sparkles,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDurationKo } from "@/features/map/geo-utils";
import { ApiError } from "@/shared/api/client";
import type { CourseListItem, DateTimeSlot } from "@/shared/api/types";
import { openCourseGoogleMapsNavigation } from "./course-actions";
import { deleteCourse, fetchMyCourses } from "./courses-api";

const TIME_SLOT_LABELS: Record<DateTimeSlot, string> = {
  HALF_DAY: "반나절",
  ALL_DAY: "종일",
  EVENING: "저녁 무드",
};

function formatDatePlanDisplay(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = dayNames[date.getDay()];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(y, m - 1, d);
    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let dDay = "";
    if (diffDays === 0) dDay = "D-Day 오늘";
    else if (diffDays > 0) dDay = `D-${diffDays}`;
    else dDay = `종료`;

    return {
      formatted: `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${dayOfWeek})`,
      dDay,
      isUpcoming: diffDays >= 0,
    };
  } catch {
    return { formatted: dateStr, dDay: "", isUpcoming: true };
  }
}

export function MyCoursesClientView() {
  const { user, isInitializing, openLoginModal, authenticatedFetch } =
    useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);

  async function handleQuickNavigate(courseId: number) {
    setNavigatingId(courseId);
    try {
      await openCourseGoogleMapsNavigation({
        authenticatedFetch,
        courseId,
        isAuthenticated: true,
      });
    } finally {
      setNavigatingId(null);
    }
  }

  useEffect(() => {
    if (isInitializing || !user) {
      return;
    }
    let active = true;
    async function load() {
      try {
        const list = await fetchMyCourses(authenticatedFetch);
        if (active) {
          setCourses(list);
          setErrorMessage(null);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("저장된 코스 목록을 불러오지 못했습니다.");
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
  }, [isInitializing, user, authenticatedFetch]);

  async function handleDelete(courseId: number, title: string) {
    if (!window.confirm(`'${title}' 코스를 보관함에서 삭제하시겠습니까?`)) {
      return;
    }
    setDeletingId(courseId);
    try {
      await deleteCourse(authenticatedFetch, courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("코스 삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const upcomingCount = useMemo(() => {
    return courses.filter((c) => {
      const plan = formatDatePlanDisplay(c.datePlanDate);
      return plan && plan.isUpcoming;
    }).length;
  }, [courses]);

  return (
    <div className="space-y-7 pb-12">
      {/* Editorial Header */}
      <header className="flex flex-col justify-between gap-5 border-b border-black/[0.08] dark:border-white/[0.08] pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-5 rounded-full bg-primary" />
            <p className="text-[11px] font-black tracking-widest text-primary uppercase">
              DATE PASS REGISTRY
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            코스 보관함
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-muted">
            완성된 데이트 패스를 관리하고, 약속 당일 원클릭 네비게이션으로 이어집니다.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/courses/new?ai=1"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-surface px-3.5 py-2 text-xs font-bold text-foreground shadow-2xs hover:border-primary/50 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI 자동 설계</span>
          </Link>
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-dark px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-black transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>새 패스 생성</span>
          </Link>
        </div>
      </header>

      {/* Auth Gate: Initializing */}
      {isInitializing ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-surface p-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="mt-3 text-xs font-medium text-muted">
            계정 정보를 확인하고 있습니다...
          </p>
        </div>
      ) : !user ? (
        /* Guest State */
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-surface p-8 sm:p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Ticket className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-black text-foreground">
            로그인 후 나만의 데이트 패스를 보관하세요
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted leading-relaxed">
            카카오 또는 Google 계정으로 로그인하면 설계한 동선이 안전하게 저장되며,
            일정 관리와 실시간 공동 편집 기능을 모두 사용할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={openLoginModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>간편 로그인</span>
            </button>
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-subtle transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>둘러보며 코스 짜기</span>
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        /* Loading Skeleton */
        <div className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-surface p-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="mt-3 text-xs font-medium text-muted">
            저장된 데이트 패스를 불러오고 있습니다...
          </p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 text-center text-xs font-semibold text-red-600">
          {errorMessage}
        </div>
      ) : courses.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.12] bg-surface/50 p-12 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-surface-subtle text-muted">
            <Compass className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-sm font-black text-foreground">
            보관함에 저장된 패스가 없습니다
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted leading-relaxed">
            지역·음식 탐색에서 마음에 드는 스팟을 담거나, AI 추천으로 10초 만에 완벽한 첫 데이트 패스를 만들어 보세요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-surface px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-subtle transition-colors"
            >
              <span>스팟 탐색하러 가기</span>
            </Link>
            <Link
              href="/courses/new?ai=1"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span>AI 자동 추천 받기</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Pass Grid List (Editorial Voucher Layout) */
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">
                총 <strong className="text-primary font-black">{courses.length}개</strong>의 패스
              </span>
              {upcomingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/50">
                  <Calendar className="h-3 w-3" />
                  <span>예정된 데이트 {upcomingCount}건</span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted">
              최근 생성 순
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => {
              const plan = formatDatePlanDisplay(course.datePlanDate);
              return (
                <article
                  key={course.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-surface p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-black/[0.2] dark:hover:border-white/[0.2] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-150"
                >
                  {/* Top Header: Schedule & Metadata */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      {plan ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-black ${
                              plan.isUpcoming
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-black/[0.04] text-muted border border-black/[0.06]"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>{plan.formatted}</span>
                          </span>
                          {plan.dDay && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                                plan.dDay.startsWith("D-Day")
                                  ? "bg-rose-500 text-white"
                                  : plan.isUpcoming
                                    ? "bg-foreground text-background"
                                    : "bg-surface-subtle text-muted"
                              }`}
                            >
                              {plan.dDay}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-black/[0.03] dark:bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-muted border border-black/[0.05]">
                          <Calendar className="h-3 w-3 opacity-60" />
                          <span>일정 미지정</span>
                        </span>
                      )}

                      <span className="text-[10px] text-muted/80 font-medium">
                        {new Date(course.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>

                    {/* Course Title Link */}
                    <Link
                      href={`/courses/${course.id}`}
                      className="mt-3 block group/link"
                    >
                      <h2 className="text-base font-black tracking-tight text-foreground group-hover/link:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h2>
                    </Link>

                    {/* Theme Tags */}
                    {course.themeTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {course.themeTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Voucher Specs Strip */}
                    <div className="mt-3.5 flex items-center divide-x divide-black/[0.08] dark:divide-white/[0.08] rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-surface-subtle/40 px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 pr-3 font-bold text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>스팟 {course.placeCount}곳</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 font-semibold text-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
                        <span>{formatDurationKo(course.totalDurationMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pl-3 font-semibold text-foreground truncate">
                        <Wallet className="h-3.5 w-3.5 text-muted shrink-0" />
                        <span>2인 {course.totalEstimatedCost.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Actions (Dashed Separator Ticket Style) */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-black/[0.08] dark:border-white/[0.08] pt-3.5">
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-foreground hover:text-primary transition-colors"
                    >
                      <span>패스 상세·지도</span>
                      <ArrowRight className="h-3 w-3 text-primary" />
                    </Link>

                    <div className="flex items-center gap-1">
                      {course.placeCount > 0 && (
                        <button
                          type="button"
                          disabled={navigatingId === course.id}
                          onClick={() => void handleQuickNavigate(course.id)}
                          title="구글 지도 원클릭 길안내"
                          className="inline-flex items-center gap-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
                        >
                          {navigatingId === course.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <Navigation className="h-3 w-3 text-primary" />
                          )}
                          <span>길안내</span>
                        </button>
                      )}
                      <Link
                        href={`/courses/${course.id}?mode=edit`}
                        title="코스 편집"
                        className="inline-flex items-center gap-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-surface-subtle transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-muted" />
                        <span>수정</span>
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === course.id}
                        onClick={() => void handleDelete(course.id, course.title)}
                        title="패스 삭제"
                        className="inline-flex items-center gap-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-surface px-2 py-1 text-[11px] font-medium text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === course.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        <span className="sr-only">삭제</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
