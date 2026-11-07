"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  BookOpenText,
  CalendarHeart,
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
  createDiaryApi,
  deleteDiaryApi,
  fetchDiariesApi,
  updateDiaryApi,
} from "./diaries-api";

function getTodayIso(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function readFileAsCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.onload = () => {
      const rawUrl = typeof reader.result === "string" ? reader.result : "";
      if (!rawUrl) {
        reject(new Error("이미지 데이터가 비어 있습니다."));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        const maxSide = 960;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function DiariesClientView() {
  const { user, isInitializing, openLoginModal, authenticatedFetch } =
    useAuth();

  const [diaries, setDiaries] = useState<DiaryDetail[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<DiaryDetail | null>(null);
  const [dateAt, setDateAt] = useState<string>("");
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
    setIsComposerOpen(true);
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
    setIsComposerOpen(true);
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
      setIsComposerOpen(false);
      setEditingDiary(null);
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
          <p className="text-xs font-bold tracking-widest text-primary">
            MEMORY JOURNAL
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            다녀온 길 위에 남기는 데이트 일기
          </h1>
          <p className="mt-1 text-sm text-muted">
            그날 걸었던 코스 동선과 사진, 둘만의 감상을 매거진처럼 차곡차곡 모아보세요.
          </p>
        </header>

        <div className="rounded-[28px] border border-line bg-surface p-10 text-center shadow-xs">
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
            className="mt-5 rounded-full bg-primary px-6 py-3 text-xs font-extrabold text-white hover:bg-primary-hover"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

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
          onClick={openNewComposer}
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-primary-hover sm:self-auto"
        >
          <PenLine className="h-4 w-4" />
          <span>오늘의 기록 남기기</span>
        </button>
      </header>

      {errorMessage && !isComposerOpen && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Composer Modal / Drawer Card */}
      {isComposerOpen && (
        <section className="rounded-[28px] border border-primary/35 bg-surface p-6 shadow-lg sm:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-foreground">
              {editingDiary ? "데이트 일기 수정하기" : "새 데이트 일기 작성"}
            </h2>
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="rounded-full p-1.5 text-muted hover:bg-surface-subtle hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-600">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-bold text-muted">
                데이트 날짜
              </span>
              <input
                type="date"
                value={dateAt}
                onChange={(e) => setDateAt(e.target.value)}
                className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-bold text-muted">
                함께 다녀온 코스 연결 (선택)
              </span>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary"
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

          <div className="mt-3 space-y-3">
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일기 제목 (예: 성수동 전시 보고 노을 보며 커피 마신 오후)"
              className="w-full rounded-xl border border-line bg-background px-4 py-2.5 text-sm font-extrabold text-foreground outline-none focus:border-primary"
            />

            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="가장 좋았던 장소, 나눴던 대화, 기억하고 싶은 장면을 자유롭게 적어보세요."
              className="w-full resize-none rounded-xl border border-line bg-background p-4 text-xs leading-relaxed text-foreground outline-none focus:border-primary sm:text-sm"
            />

            {/* Photo Attachments */}
            <div className="space-y-2 rounded-2xl bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-foreground">
                  추억 사진 첨부 ({imageUrls.length}/6)
                </span>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-extrabold text-primary hover:bg-primary/15">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>기기에서 사진 선택</span>
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
                  placeholder="또는 이미지 URL 붙여넣기 (https://...)"
                  className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:border-primary/40"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>URL 추가</span>
                </button>
              </div>

              {imageUrls.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
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
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        className="absolute top-1 right-1 rounded-full bg-black/65 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="rounded-full border border-line bg-background px-4 py-2 text-xs font-bold text-muted hover:text-foreground"
            >
              취소
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSaveDiary()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-extrabold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{editingDiary ? "수정 완료" : "일기 저장하기"}</span>
            </button>
          </div>
        </section>
      )}

      {/* Diary Feed */}
      {!hasLoaded ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-line bg-surface p-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-xs font-bold text-muted">
            데이트 일기장을 불러오고 있어요...
          </p>
        </div>
      ) : diaries.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-line bg-surface p-12 text-center">
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-white hover:bg-primary-hover"
          >
            <PenLine className="h-3.5 w-3.5" />
            <span>첫 일기 작성하기</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {diaries.map((entry) => {
            const linkedTitle =
              entry.courseId !== null
                ? (courseTitleMap.get(entry.courseId) ??
                  `데이트 코스 #${entry.courseId}`)
                : null;
            return (
              <article
                key={entry.id}
                className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(24,24,27,0.03)] sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-primary">
                    <CalendarHeart className="h-4 w-4" />
                    <span>{entry.dateAt}</span>
                    {entry.coupleId !== null && (
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
                        우리 커플 공유 일기
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.courseId !== null && linkedTitle && (
                      <Link
                        href={`/courses/${entry.courseId}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-[11px] font-bold text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        <Route className="h-3 w-3 text-primary" />
                        <span>{linkedTitle}</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditComposer(entry)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-background px-3 py-1 text-[11px] font-bold text-muted hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>수정</span>
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === entry.id}
                      onClick={() => void handleDeleteDiary(entry)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-background px-3 py-1 text-[11px] font-bold text-muted hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>

                <h2 className="mt-3 text-xl font-black text-foreground">
                  {entry.title}
                </h2>
                <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted">
                  {entry.content}
                </p>

                {entry.imageUrls.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-3">
                    {entry.imageUrls.map((url, idx) => (
                      <div
                        key={`${entry.id}-img-${idx}`}
                        className="aspect-4/3 overflow-hidden rounded-2xl border border-line bg-background"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${entry.title} 사진 ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

