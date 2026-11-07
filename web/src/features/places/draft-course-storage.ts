import type { PlaceDetail } from "@/shared/api/types";

const DRAFT_COURSE_STORAGE_KEY = "dayt.course.draftPlaces";

export function readDraftPlaces(): PlaceDetail[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DRAFT_COURSE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PlaceDetail =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "number" &&
        typeof (item as Record<string, unknown>).name === "string",
    );
  } catch {
    return [];
  }
}

export function writeDraftPlaces(places: PlaceDetail[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_COURSE_STORAGE_KEY, JSON.stringify(places));
}

export function clearDraftPlaces(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_COURSE_STORAGE_KEY);
}

