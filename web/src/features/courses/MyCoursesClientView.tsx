"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Clock,
  Compass,
  Loader2,
  LogIn,
  Navigation,
  Pencil,
  Plus,
  Sparkles,
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
  HALF_DAY: "반나절 코스",
  ALL_DAY: "종일 코스",
  EVENING: "저녁 무드",
};

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
    if (!window.confirm(`'${title}' 코스를 삭제하시겠어요?`)) {
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
            직접 설계한 데이트 동선을 지도로 한눈에 확인하고, 언제든 순서를 수정하거나 링크로 공유하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/courses/new?ai=1"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI 코스 설계</span>
          </Link>
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            <span>새 코스 만들기</span>
          </Link>
        </div>
      </header>

      {isInitializing ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-xs font-bold text-muted">
            로그인 정보를 확인하고 있어요...
          </p>
        </div>
      ) : !user ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center shadow-[0_8px_28px_rgba(24,24,27,0.03)]">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-lg font-black text-foreground">
            로그인하면 저장한 데이트 코스를 모아볼 수 있어요
          </h2>
          <p className="mt-1 text-xs text-muted">
            카카오 또는 Google 계정으로 3초 만에 로그인하고 나만의 코스를 저장해 보세요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={openLoginModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
            >
              <LogIn className="h-4 w-4" />
              <span>소셜 로그인하기</span>
            </button>
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary/40"
            >
              <Compass className="h-4 w-4 text-primary" />
              <span>먼저 코스 짜보기</span>
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-xs font-bold text-muted">
            내 저장 코스를 불러오고 있어요...
          </p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50/75 p-6 text-center text-xs font-bold text-red-600">
          {errorMessage}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-12 text-center">
          <Compass className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-base font-black text-foreground">
            아직 저장된 데이트 코스가 없어요
          </h2>
          <p className="mt-1 text-xs text-muted">
            데이트 탐색에서 마음에 드는 장소를 담거나 코스 메이커에서 첫 루트를 완성해 보세요!
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary/40"
            >
              <span>장소 탐색하러 가기</span>
            </Link>
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>코스 메이커 열기</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <article
              key={course.id}
              className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-6 shadow-[0_8px_24px_rgba(24,24,27,0.03)] transition-all hover:border-primary/40"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-extrabold text-primary">
                      <Sparkles className="h-3 w-3" />
                      <span>경유지 {course.placeCount}곳</span>
                    </span>
                    {course.datePlanDate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                        <Calendar className="h-3 w-3" />
                        <span>{course.datePlanDate} 데이트</span>
                      </span>
                    )}
                    {course.timeSlot && (
                      <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
                        {TIME_SLOT_LABELS[course.timeSlot]}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-muted">
                    {new Date(course.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                <Link href={`/courses/${course.id}`} className="group block">
                  <h2 className="mt-3 text-lg font-extrabold text-foreground group-hover:text-primary">
                    {course.title}
                  </h2>
                </Link>

                {course.themeTags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {course.themeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line bg-background px-2.5 py-0.5 text-[11px] font-semibold text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-background p-3.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>{formatDurationKo(course.totalDurationMinutes)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span>2인 {course.totalEstimatedCost.toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-4">
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2 text-xs font-extrabold text-white hover:opacity-90"
                >
                  <span>동선 지도 · 상세 보기</span>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
                </Link>

                <div className="flex items-center gap-1.5">
                  {course.placeCount > 0 && (
                    <button
                      type="button"
                      disabled={navigatingId === course.id}
                      onClick={() => void handleQuickNavigate(course.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:border-primary/40 disabled:opacity-50"
                    >
                      {navigatingId === course.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>길안내</span>
                    </button>
                  )}
                  <Link
                    href={`/courses/${course.id}?mode=edit`}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-subtle"
                  >
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                    <span>수정</span>
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === course.id}
                    onClick={() => void handleDelete(course.id, course.title)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-2 text-xs font-bold text-muted hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === course.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

