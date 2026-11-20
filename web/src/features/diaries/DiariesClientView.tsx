"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarHeart,
  ImageIcon,
  ImagePlus,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  Quote,
  Route,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchMyCourses } from "@/features/courses/courses-api";
import { ApiError } from "@/shared/api/client";
import type {
  CourseListItem,
  DiaryDetail,
  DiaryUpsertRequest,
} from "@/shared/api/types";
import {
  createDiaryApi,
  deleteDiaryApi,
  fetchDiariesApi,
  updateDiaryApi,
} from "./diaries-api";
import {
  formatDiaryDateDisplay,
  getTodayIso,
  readFileAsCompressedDataUrl,
} from "./diary-utils";

type DiaryPageTab = "feed" | "write";
type DiaryFilterMode = "ALL" | "WITH_PHOTO" | "WITH_COURSE";

export function DiariesClientView() {
  const { user, isInitializing, openLoginModal, authenticatedFetch } =
    useAuth();

  const [diaries, setDiaries] = useState<DiaryDetail[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DiaryPageTab>("feed");
  const [filterMode, setFilterMode] = useState<DiaryFilterMode>("ALL");

  const [editingDiary, setEditingDiary] = useState<DiaryDetail | null>(null);
  const [dateAt, setDateAt] = useState<string>(() => getTodayIso());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isInitializing || !user) {
      return;
    }
    let active = true;
    async function loadDiariesAndCourses() {
      try {
        const [diaryList, courseList] = await Promise.all([
          fetchDiariesApi(authenticatedFetch, 0, 30),
          fetchMyCourses(authenticatedFetch),
        ]);
        if (!active) return;
        setDiaries(diaryList);
        setCourses(courseList);
        setErrorMessage(null);
      } catch (err) {
        if (!active) return;
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : "데이트 일기 목록을 불러오지 못했습니다.",
        );
      } finally {
        if (active) setHasLoaded(true);
      }
    }
    void loadDiariesAndCourses();
    return () => {
      active = false;
    };
  }, [isInitializing, user, authenticatedFetch]);

  const courseTitleMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of courses) {
      map.set(c.id, c.title);
    }
    return map;
  }, [courses]);

  const stats = useMemo(() => {
    let photoCount = 0;
    let courseCount = 0;
    for (const d of diaries) {
      if (d.imageUrls.length > 0) photoCount += 1;
      if (d.courseId !== null) courseCount += 1;
    }
    return { photoCount, courseCount };
  }, [diaries]);

  const filteredDiaries = useMemo(() => {
    if (filterMode === "WITH_PHOTO") {
      return diaries.filter((d) => d.imageUrls.length > 0);
    }
    if (filterMode === "WITH_COURSE") {
      return diaries.filter((d) => d.courseId !== null);
    }
    return diaries;
  }, [diaries, filterMode]);

  function openNewComposer() {
    if (!user) {
      openLoginModal();
      return;
    }
    setEditingDiary(null);
    setDateAt(getTodayIso());
    setTitle("");
    setContent("");
    setSelectedCourseId("");
    setImageUrls([]);
    setPhotoUrlInput("");
    setErrorMessage(null);
    setActiveTab("write");
  }

  function openEditComposer(diary: DiaryDetail) {
    setEditingDiary(diary);
    setDateAt(diary.dateAt);
    setTitle(diary.title);
    setContent(diary.content);
    setSelectedCourseId(diary.courseId !== null ? String(diary.courseId) : "");
    setImageUrls(diary.imageUrls);
    setPhotoUrlInput("");
    setErrorMessage(null);
    setActiveTab("write");
  }

  function cancelComposer() {
    setErrorMessage(null);
    setEditingDiary(null);
    setActiveTab("feed");
  }

  function handleSelectWriteTab() {
    if (activeTab === "write") return;
    openNewComposer();
  }

  function handleAddImageUrl() {
    const trimmed = photoUrlInput.trim();
    if (!trimmed) return;
    if (imageUrls.length >= 6) {
      setErrorMessage("사진은 한 일기당 최대 6장까지 첨부할 수 있습니다.");
      return;
    }
    setImageUrls((prev) => [...prev, trimmed]);
    setPhotoUrlInput("");
    setErrorMessage(null);
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, 6 - imageUrls.length);
    const chosen = Array.from(files).slice(0, remainingSlots);

    const converted: string[] = [];
    for (const file of chosen) {
      try {
        const dataUrl = await readFileAsCompressedDataUrl(file);
        converted.push(dataUrl);
      } catch {
        // skip unreadable file
      }
    }
    if (converted.length > 0) {
      setImageUrls((prev) => [...prev, ...converted]);
    }
    event.target.value = "";
  }

  async function handleSaveDiary() {
    if (!title.trim()) {
      setErrorMessage("일기 제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      setErrorMessage("오늘 데이트의 감상을 적어주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: DiaryUpsertRequest = {
      dateAt,
      title: title.trim(),
      content: content.trim(),
      courseId: selectedCourseId ? Number(selectedCourseId) : null,
      imageUrls,
    };

    try {
      if (editingDiary) {
        const updated = await updateDiaryApi(
          authenticatedFetch,
          editingDiary.id,
          payload,
        );
        setDiaries((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d)),
        );
      } else {
        const created = await createDiaryApi(authenticatedFetch, payload);
        setDiaries((prev) => [created, ...prev]);
      }
      setEditingDiary(null);
      setActiveTab("feed");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "일기를 저장하는 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDiary(diary: DiaryDetail) {
    if (!window.confirm(`'${diary.title}' 일기를 삭제하시겠어요?`)) {
      return;
    }
    setDeletingId(diary.id);
    try {
      await deleteDiaryApi(authenticatedFetch, diary.id);
      setDiaries((prev) => prev.filter((d) => d.id !== diary.id));
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "일기 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!isInitializing && !user) {
    return (
      <div className="space-y-6">
        <header>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-primary" />
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              JOURNAL & MOMENTS
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            데이트 일기장
          </h1>
          <p className="mt-1 text-sm text-muted">
            함께 걸었던 코스 동선과 사진, 둘만의 순간을 기록합니다.
          </p>
        </header>

        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-xs">
          <BookOpenText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-lg font-black text-foreground">
            로그인하고 첫 데이트 일기를 남겨보세요
          </h2>
          <p className="mt-1 text-xs text-muted">
            커플 연결을 완료하면 두 사람이 작성한 데이트 일기가 하나의 일기장에 함께 쌓입니다.
          </p>
          <button
            type="button"
            onClick={openLoginModal}
            className="mt-5 rounded-full bg-surface-dark px-6 py-2.5 text-xs font-bold text-white transition-colors hover:opacity-90"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editorial Header + Dedicated Mode Tabs */}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-primary" />
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              JOURNAL & MOMENTS
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            데이트 일기장
          </h1>
          <p className="mt-1 text-xs font-medium text-muted sm:text-sm">
            함께 걸었던 코스 동선과 사진, 둘만의 순간을 기록합니다.
          </p>
        </div>

        {/* 2-Tab Segmented Switcher with Sliding Pill */}
        <div
          role="tablist"
          aria-label="일기장 보기 전환"
          className="relative grid w-full grid-cols-2 rounded-full border border-line bg-surface-subtle p-1 sm:w-auto sm:min-w-[320px]"
        >
          <span
            aria-hidden="true"
            style={{
              transform: `translateX(${activeTab === "write" ? 100 : 0}%)`,
            }}
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full border border-line/80 bg-surface shadow-2xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "feed"}
            onClick={() => setActiveTab("feed")}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "feed"
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BookOpenText
              className={`h-3.5 w-3.5 ${
                activeTab === "feed" ? "text-primary" : "text-muted"
              }`}
            />
            <span>추억 아카이브</span>
            <span className="rounded-full bg-surface-subtle px-1.5 py-0.2 text-[10px] font-extrabold text-muted">
              {diaries.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "write"}
            onClick={handleSelectWriteTab}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "write"
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <PenLine
              className={`h-3.5 w-3.5 ${
                activeTab === "write" ? "text-primary" : "text-muted"
              }`}
            />
            <span>{editingDiary ? "일기 수정 중" : "오늘의 기록 남기기"}</span>
          </button>
        </div>
      </header>

      {errorMessage && activeTab === "feed" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* TAB 2: Dedicated Write Studio View */}
      {activeTab === "write" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={cancelComposer}
                aria-label="아카이브로 돌아가기"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-subtle text-muted transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-base font-black text-foreground sm:text-lg">
                  {editingDiary
                    ? "데이트 일기 수정하기"
                    : "오늘의 데이트 기록 남기기"}
                </h2>
                <p className="text-xs text-muted">
                  함께 다녀온 코스를 연결하고 기억하고 싶은 장면과 사진을 담아보세요.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* 12-Column Compose Studio */}
          <div className="mt-5 grid items-start gap-6 lg:grid-cols-12">
            {/* Left: Main Writing Form */}
            <div className="space-y-4 lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">
                    데이트 날짜
                  </span>
                  <input
                    type="date"
                    value={dateAt}
                    onChange={(e) => setDateAt(e.target.value)}
                    className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">
                    함께 다녀온 코스 연결{" "}
                    <span className="font-normal text-muted">(선택)</span>
                  </span>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary"
                  >
                    <option value="">연결할 코스 없음</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.placeCount}곳)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="diary-title-input"
                    className="text-xs font-bold text-foreground"
                  >
                    일기 제목
                  </label>
                  <span className="text-[11px] text-muted">
                    {title.length}/100
                  </span>
                </div>
                <input
                  id="diary-title-input"
                  type="text"
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 성수동 전시 보고 노을 보며 커피 마신 오후"
                  className="w-full rounded-xl border border-line bg-background px-4 py-2.5 text-sm font-extrabold text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="diary-content-textarea"
                  className="block text-xs font-bold text-foreground"
                >
                  오늘의 감상
                </label>
                <textarea
                  id="diary-content-textarea"
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="가장 좋았던 장소, 나눴던 대화, 기억하고 싶은 장면을 자유롭게 적어보세요."
                  className="w-full resize-y rounded-xl border border-line bg-background p-4 text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            {/* Right: Photo Attachment Studio */}
            <div className="space-y-3 rounded-2xl border border-line bg-surface-subtle/50 p-4 sm:p-5 lg:col-span-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-foreground">
                    추억 사진 첨부 ({imageUrls.length}/6)
                  </span>
                  <p className="text-[11px] text-muted">
                    첫 번째 사진이 아카이브 카드의 커버로 표시됩니다.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary/15">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>사진 선택</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void handleFileSelect(e)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="이미지 URL 붙여넣기 (https://...)"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/40"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>추가</span>
                </button>
              </div>

              {imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3">
                  {imageUrls.map((url, index) => (
                    <div
                      key={`${url.slice(0, 24)}-${index}`}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`첨부 사진 ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                          커버
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        aria-label={`첨부 사진 ${index + 1} 삭제`}
                        className="absolute top-1.5 right-1.5 rounded-full bg-black/65 p-1 text-white transition-colors hover:bg-black"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 p-6 text-center">
                  <ImageIcon className="h-7 w-7 text-muted/60" />
                  <p className="mt-2 text-xs font-semibold text-muted">
                    사진 없이 글로만 기록해도 멋진 에디토리얼 카드로 보관됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
            <button
              type="button"
              onClick={cancelComposer}
              className="rounded-full border border-line bg-background px-4 py-2 text-xs font-bold text-muted transition-colors hover:text-foreground"
            >
              아카이브 목록으로 돌아가기
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSaveDiary()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-xs font-extrabold text-white shadow-2xs transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PenLine className="h-3.5 w-3.5" />
              )}
              <span>{editingDiary ? "수정 완료" : "일기 저장하기"}</span>
            </button>
          </div>
        </section>
      ) : (
        /* TAB 1: Editorial Archive Grid Feed */
        <div className="space-y-5">
          {/* Summary & Filter Toolbar */}
          {hasLoaded && diaries.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMode("ALL")}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterMode === "ALL"
                      ? "bg-surface-dark text-white"
                      : "bg-surface-subtle text-muted hover:text-foreground"
                  }`}
                >
                  전체 보기 ({diaries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("WITH_PHOTO")}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterMode === "WITH_PHOTO"
                      ? "bg-surface-dark text-white"
                      : "bg-surface-subtle text-muted hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>사진 기록 ({stats.photoCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("WITH_COURSE")}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterMode === "WITH_COURSE"
                      ? "bg-surface-dark text-white"
                      : "bg-surface-subtle text-muted hover:text-foreground"
                  }`}
                >
                  <Route className="h-3 w-3" />
                  <span>코스 연결 ({stats.courseCount})</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted">
                <button
                  type="button"
                  onClick={openNewComposer}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>새 기록 남기기</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Feed Body */}
          {!hasLoaded ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="mt-3 text-xs font-bold text-muted">
                데이트 일기장을 불러오고 있어요...
              </p>
            </div>
          ) : diaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
              <CalendarHeart className="mx-auto h-9 w-9 text-primary/75" />
              <h2 className="mt-3 text-base font-black text-foreground">
                아직 작성된 데이트 일기가 없어요
              </h2>
              <p className="mt-1 text-xs text-muted">
                다녀온 코스를 연결해 첫 번째 추억 기록을 남겨보세요!
              </p>
              <button
                type="button"
                onClick={openNewComposer}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-primary-hover"
              >
                <PenLine className="h-3.5 w-3.5" />
                <span>첫 일기 작성하기</span>
              </button>
            </div>
          ) : filteredDiaries.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-10 text-center">
              <p className="text-sm font-black text-foreground">
                선택한 조건에 맞는 일기가 없어요
              </p>
              <button
                type="button"
                onClick={() => setFilterMode("ALL")}
                className="mt-3 rounded-full border border-line bg-surface-subtle px-4 py-1.5 text-xs font-bold text-foreground hover:border-primary/40"
              >
                전체 일기 보기
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredDiaries.map((entry) => {
                const linkedTitle =
                  entry.courseId !== null
                    ? (courseTitleMap.get(entry.courseId) ??
                      `데이트 코스 #${entry.courseId}`)
                    : null;
                const hasCover = entry.imageUrls.length > 0;

                return (
                  <article
                    key={entry.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition-all duration-150 hover:border-foreground/25 hover:shadow-md"
                  >
                    {/* Top Visual Header */}
                    {hasCover ? (
                      <Link
                        href={`/diaries/${entry.id}`}
                        className="relative block aspect-16/10 w-full overflow-hidden bg-surface-subtle text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.imageUrls[0]}
                          alt={entry.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
                          <ImageIcon className="h-3 w-3" />
                          <span>사진 {entry.imageUrls.length}장</span>
                        </div>
                        <span className="absolute bottom-3 left-4 text-xs font-extrabold text-white/95 drop-shadow-xs">
                          {formatDiaryDateDisplay(entry.dateAt)}
                        </span>
                      </Link>
                    ) : (
                      <Link
                        href={`/diaries/${entry.id}`}
                        className="flex items-center justify-between border-b border-line/70 bg-surface-subtle/65 px-5 py-4 text-left transition-colors group-hover:bg-surface-subtle"
                      >
                        <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary">
                          <CalendarHeart className="h-3.5 w-3.5" />
                          <span>{formatDiaryDateDisplay(entry.dateAt)}</span>
                        </div>
                        <Quote className="h-4 w-4 text-muted/40" />
                      </Link>
                    )}

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        {/* Linked Course Badge */}
                        {entry.courseId !== null && linkedTitle && (
                          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/courses/${entry.courseId}`}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface-subtle px-2.5 py-0.5 text-[10px] font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                            >
                              <Route className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate">{linkedTitle}</span>
                            </Link>
                          </div>
                        )}

                        <Link
                          href={`/diaries/${entry.id}`}
                          className="block w-full text-left"
                        >
                          <h2 className="line-clamp-1 text-base font-black tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
                            {entry.title}
                          </h2>
                          <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted sm:text-sm">
                            {entry.content}
                          </p>
                        </Link>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/70 pt-3.5">
                        <Link
                          href={`/diaries/${entry.id}`}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-primary transition-transform hover:translate-x-0.5"
                        >
                          <span>전문 읽기</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditComposer(entry)}
                            className="inline-flex items-center gap-1 rounded-full border border-line bg-background px-2.5 py-1 text-[11px] font-bold text-muted transition-colors hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>수정</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === entry.id}
                            onClick={() => void handleDeleteDiary(entry)}
                            className="inline-flex items-center gap-1 rounded-full border border-line bg-background px-2.5 py-1 text-[11px] font-bold text-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:hover:border-red-800/70 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>삭제</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
