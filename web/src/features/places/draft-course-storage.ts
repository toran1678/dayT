import { useSyncExternalStore } from "react";
import type { PlaceDetail } from "@/shared/api/types";

const DRAFT_COURSE_STORAGE_KEY = "dayt.course.draftPlaces";
const EMPTY_DRAFT_PLACES: PlaceDetail[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined = undefined;
let cachedParsed: PlaceDetail[] = EMPTY_DRAFT_PLACES;

function parseDraftPlacesRaw(raw: string | null): PlaceDetail[] {
  if (!raw) return EMPTY_DRAFT_PLACES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return EMPTY_DRAFT_PLACES;
    }
    const valid = parsed.filter(
      (item): item is PlaceDetail =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "number" &&
        typeof (item as Record<string, unknown>).name === "string",
    );
    return valid.length > 0 ? valid : EMPTY_DRAFT_PLACES;
  } catch {
    return EMPTY_DRAFT_PLACES;
  }
}

export function readDraftPlaces(): PlaceDetail[] {
  if (typeof window === "undefined") return EMPTY_DRAFT_PLACES;
  try {
    const raw = window.localStorage.getItem(DRAFT_COURSE_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedParsed;
    }
    cachedRaw = raw;
    cachedParsed = parseDraftPlacesRaw(raw);
    return cachedParsed;
  } catch {
    return EMPTY_DRAFT_PLACES;
  }
}

function notifyDraftListeners(): void {
  listeners.forEach((listener) => listener());
}

export function writeDraftPlaces(places: PlaceDetail[]): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(places);
  window.localStorage.setItem(DRAFT_COURSE_STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedParsed = places.length > 0 ? places : EMPTY_DRAFT_PLACES;
  notifyDraftListeners();
}

export function clearDraftPlaces(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_COURSE_STORAGE_KEY);
  cachedRaw = null;
  cachedParsed = EMPTY_DRAFT_PLACES;
  notifyDraftListeners();
}

function subscribeDraftPlaces(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onStoreChange);
    };
  }
  function handleStorageEvent(event: StorageEvent) {
    if (event.key === null || event.key === DRAFT_COURSE_STORAGE_KEY) {
      cachedRaw = undefined;
      onStoreChange();
    }
  }
  window.addEventListener("storage", handleStorageEvent);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

function getServerDraftSnapshot(): PlaceDetail[] {
  return EMPTY_DRAFT_PLACES;
}

export function useDraftPlaces(): PlaceDetail[] {
  return useSyncExternalStore(
    subscribeDraftPlaces,
    readDraftPlaces,
    getServerDraftSnapshot,
  );
}
