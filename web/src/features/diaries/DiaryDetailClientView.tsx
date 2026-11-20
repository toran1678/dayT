"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  CalendarHeart,
  ImageIcon,
  ImagePlus,
  Loader2,
  Pencil,
  PenLine,
  Plus,
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
  deleteDiaryApi,
  fetchDiaryDetailApi,
  updateDiaryApi,
} from "./diaries-api";
import {
  formatDiaryDateDisplay,
  readFileAsCompressedDataUrl,
} from "./diary-utils";

interface DiaryDetailClientViewProps {
  diaryId: number;
}

export function DiaryDetailClientView({ diaryId }: DiaryDetailClientViewProps) {
  const router = useRouter();
  const { user, isInitializing, openLoginModal, authenticatedFetch } =
    useAuth();

  const isValidDiaryId = Number.isInteger(diaryId) && diaryId > 0;

  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [dateAt, setDateAt] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isValidDiaryId || isInitializing || !user) {
      return;
    }
    let active = true;
    async function loadDetail() {
      try {
        const [detail, courseList] = await Promise.all([
          fetchDiaryDetailApi(authenticatedFetch, diaryId),
          fetchMyCourses(authenticatedFetch).catch(() => [] as CourseListItem[]),
        ]);
        if (!active) return;
        setDiary(detail);
        setCourses(courseList);
        setErrorMessage(null);
      } catch (err) {
        if (!active) return;
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : "일기 상세 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (active) setHasLoaded(true);
      }
    }
    void loadDetail();
    return () => {
      active = false;
    };
  }, [isValidDiaryId, diaryId, isInitializing, user, authenticatedFetch]);

  const linkedCourseTitle = useMemo(() => {
    if (!diary || diary.courseId === null) return null;
    const match = courses.find((c) => c.id === diary.courseId);
    return match ? match.title : `데이트 코스 #${diary.courseId}`;
  }, [diary, courses]);

  function enterEditMode() {
    if (!diary) return;
    setDateAt(diary.dateAt);
    setTitle(diary.title);
    setContent(diary.content);
    setSelectedCourseId(diary.courseId !== null ? String(diary.courseId) : "");
    setImageUrls(diary.imageUrls);
    setPhotoUrlInput("");
    setErrorMessage(null);
    setIsEditing(true);
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

  async function handleSaveEdit() {
    if (!diary) return;
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
      const updated = await updateDiaryApi(
        authenticatedFetch,
        diary.id,
        payload,
      );
      setDiary(updated);
      setIsEditing(false);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "일기를 수정하는 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!diary) return;
    if (!window.confirm(`'${diary.title}' 일기를 삭제하시겠어요?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDiaryApi(authenticatedFetch, diary.id);
      router.push("/diaries");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "일기 삭제 중 오류가 발생했습니다.",
      );
      setIsDeleting(false);
    }
  }

  if (!isValidDiaryId) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <p className="text-sm font-black text-foreground">
          잘못된 일기 경로입니다.
        </p>
        <Link
          href="/diaries"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-subtle px-4 py-2 text-xs font-bold text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>일기장 목록으로 돌아가기</span>
        </Link>
      </div>
    );
  }

  if (!isInitializing && !user) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <p className="text-base font-black text-foreground">
          일기를 조회하려면 로그인이 필요합니다.
        </p>
        <button
          type="button"
          onClick={openLoginModal}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (!hasLoaded || isInitializing) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-10">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="mt-3 text-xs font-bold text-muted">
          데이트 일기를 불러오고 있어요...
        </p>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/75 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-sm font-extrabold text-red-600 dark:text-red-400">
          {errorMessage ?? "요청한 일기를 찾을 수 없습니다."}
        </p>
        <Link
          href="/diaries"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-dark px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>일기장 목록으로 돌아가기</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/diaries"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>일기장 목록</span>
        </Link>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={enterEditMode}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-foreground/35"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span>수정하기</span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:hover:border-red-800/70 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>삭제</span>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {isEditing ? (
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-8">
          <div className="border-b border-line/70 pb-4">
            <h1 className="text-lg font-black text-foreground">
              데이트 일기 수정
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              내용이나 첨부 사진을 수정하고 저장하세요.
            </p>
          </div>

          <div className="mt-5 grid items-start gap-6 lg:grid-cols-12">
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
                    htmlFor="edit-diary-title"
                    className="text-xs font-bold text-foreground"
                  >
                    일기 제목
                  </label>
                  <span className="text-[11px] text-muted">
                    {title.length}/100
                  </span>
                </div>
                <input
                  id="edit-diary-title"
                  type="text"
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-line bg-background px-4 py-2.5 text-sm font-extrabold text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-diary-content"
                  className="block text-xs font-bold text-foreground"
                >
                  오늘의 감상
                </label>
                <textarea
                  id="edit-diary-content"
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full resize-y rounded-xl border border-line bg-background p-4 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

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
                      className="group relative aspect-square overflow-hidden rounded-xl bg-surface"
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
                    사진을 첨부하지 않아도 일기로 저장됩니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-line/70 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-full border border-line bg-background px-4 py-2 text-xs font-bold text-muted transition-colors hover:text-foreground"
            >
              취소
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSaveEdit()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2 text-xs font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PenLine className="h-3.5 w-3.5" />
              )}
              <span>수정 완료</span>
            </button>
          </div>
        </section>
      ) : (
        <article className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary">
              <CalendarHeart className="h-4 w-4" />
              <span>{formatDiaryDateDisplay(diary.dateAt)}</span>
            </span>

            {diary.courseId !== null && linkedCourseTitle && (
              <Link
                href={`/courses/${diary.courseId}`}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-subtle px-3 py-0.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Route className="h-3.5 w-3.5 text-primary" />
                <span>{linkedCourseTitle}</span>
              </Link>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {diary.title}
          </h1>

          <div className="mt-6 border-t border-line/70 pt-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 sm:text-base sm:leading-loose">
              {diary.content}
            </p>
          </div>

          {diary.imageUrls.length > 0 && (
            <div
              className={`mt-8 grid gap-4 ${
                diary.imageUrls.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {diary.imageUrls.map((url, idx) => (
                <div
                  key={`detail-${diary.id}-img-${idx}`}
                  className="overflow-hidden rounded-xl bg-surface-subtle"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${diary.title} 사진 ${idx + 1}`}
                    className="max-h-[480px] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </article>
      )}
    </div>
  );
}

