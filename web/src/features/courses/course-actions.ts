import type { CourseDetail, GoogleMapsLinkResponse } from "@/shared/api/types";
import {
  fetchGoogleMapsLink,
  type AuthenticatedFetchFn,
} from "./courses-api";

export function buildGoogleMapsLinksFromCourse(
  course: CourseDetail,
): GoogleMapsLinkResponse | null {
  if (course.places.length === 0) {
    return null;
  }

  const coords = course.places.map(
    (item) => `${item.place.latitude},${item.place.longitude}`,
  );
  const first = coords[0];
  const last = coords[coords.length - 1];

  if (coords.length === 1) {
    const query = encodeURIComponent(first);
    return {
      deepLinkUrl: `comgooglemaps://?q=${query}`,
      webFallbackUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    };
  }

  const waypoints = coords.slice(1, -1).join("|");
  const webParams = new URLSearchParams({
    api: "1",
    origin: first,
    destination: last,
    travelmode: "walking",
  });
  if (waypoints) {
    webParams.set("waypoints", waypoints);
  }

  const daddr =
    coords.length > 2 ? `${coords.slice(1, -1).join("+to:")}+to:${last}` : last;

  return {
    deepLinkUrl: `comgooglemaps://?saddr=${encodeURIComponent(first)}&daddr=${encodeURIComponent(daddr)}&directionsmode=walking`,
    webFallbackUrl: `https://www.google.com/maps/dir/?${webParams.toString()}`,
  };
}

export function launchGoogleMapsNavigation(links: GoogleMapsLinkResponse): void {
  if (typeof window === "undefined") return;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(
    window.navigator.userAgent ?? "",
  );

  if (!isMobile) {
    window.open(links.webFallbackUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const startedAt = Date.now();
  window.location.href = links.deepLinkUrl;

  window.setTimeout(() => {
    if (
      document.visibilityState === "visible" &&
      Date.now() - startedAt < 2200
    ) {
      window.open(links.webFallbackUrl, "_blank", "noopener,noreferrer");
    }
  }, 900);
}

export async function openCourseGoogleMapsNavigation(params: {
  authenticatedFetch: AuthenticatedFetchFn;
  courseId?: number;
  isAuthenticated: boolean;
  fallbackCourse?: CourseDetail | null;
}): Promise<void> {
  const { authenticatedFetch, courseId, isAuthenticated, fallbackCourse } =
    params;

  if (isAuthenticated && courseId) {
    try {
      const links = await fetchGoogleMapsLink(authenticatedFetch, courseId);
      launchGoogleMapsNavigation(links);
      return;
    } catch {
      // Fallback to client-computed link if available
    }
  }

  if (fallbackCourse) {
    const fallbackLinks = buildGoogleMapsLinksFromCourse(fallbackCourse);
    if (fallbackLinks) {
      launchGoogleMapsNavigation(fallbackLinks);
    }
  }
}

export async function shareCoursePass(params: {
  title: string;
  description?: string | null;
  shareToken: string;
}): Promise<"shared" | "copied" | "prompted"> {
  if (typeof window === "undefined") {
    return "copied";
  }

  const shareUrl = `${window.location.origin}/courses/shared/${params.shareToken}`;
  const shareTitle = `[DayT] ${params.title}`;
  const shareText =
    params.description?.trim() ||
    "오늘 우리 데이트 코스 동선 패스 확인해봐!";

  const isMobile = /Android|iPhone|iPad|iPod/i.test(
    window.navigator.userAgent ?? "",
  );

  if (isMobile && typeof window.navigator.share === "function") {
    try {
      await window.navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "shared";
      }
    }
  }

  try {
    await window.navigator.clipboard.writeText(shareUrl);
    return "copied";
  } catch {
    window.prompt("아래 코스 공유 링크를 복사해 카카오톡에 전달해보세요:", shareUrl);
    return "prompted";
  }
}

