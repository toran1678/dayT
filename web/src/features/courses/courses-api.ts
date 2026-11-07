import {
  API_BASE_URL,
  ApiError,
  apiFetch,
  type ApiRequestOptions,
} from "@/shared/api/client";
import type {
  CourseDetail,
  CourseListItem,
  CourseRecommendationPreview,
  CourseRecommendRequest,
  CourseUpsertRequest,
  ErrorResponse,
  GoogleMapsLinkResponse,
} from "@/shared/api/types";

export type AuthenticatedFetchFn = <TResponse>(
  endpoint: `/api/v1/${string}`,
  options?: Omit<ApiRequestOptions, "accessToken">,
) => Promise<TResponse>;

export function fetchMyCourses(
  authenticatedFetch: AuthenticatedFetchFn,
): Promise<CourseListItem[]> {
  return authenticatedFetch<CourseListItem[]>("/api/v1/courses", {
    method: "GET",
  });
}

export function createCourse(
  authenticatedFetch: AuthenticatedFetchFn,
  payload: CourseUpsertRequest,
): Promise<CourseDetail> {
  return authenticatedFetch<CourseDetail>("/api/v1/courses", {
    method: "POST",
    body: payload,
  });
}

export function recommendCourse(
  authenticatedFetch: AuthenticatedFetchFn,
  payload: CourseRecommendRequest,
): Promise<CourseRecommendationPreview> {
  return authenticatedFetch<CourseRecommendationPreview>(
    "/api/v1/courses/recommend",
    {
      method: "POST",
      body: payload,
    },
  );
}

export function fetchCourseDetail(
  authenticatedFetch: AuthenticatedFetchFn,
  courseId: number,
): Promise<CourseDetail> {
  return authenticatedFetch<CourseDetail>(`/api/v1/courses/${courseId}`, {
    method: "GET",
  });
}

export function fetchGoogleMapsLink(
  authenticatedFetch: AuthenticatedFetchFn,
  courseId: number,
): Promise<GoogleMapsLinkResponse> {
  return authenticatedFetch<GoogleMapsLinkResponse>(
    `/api/v1/courses/${courseId}/google-maps-link`,
    {
      method: "GET",
    },
  );
}

export function updateCourse(
  authenticatedFetch: AuthenticatedFetchFn,
  courseId: number,
  payload: CourseUpsertRequest,
): Promise<CourseDetail> {
  return authenticatedFetch<CourseDetail>(`/api/v1/courses/${courseId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteCourse(
  authenticatedFetch: AuthenticatedFetchFn,
  courseId: number,
): Promise<void> {
  return authenticatedFetch<void>(`/api/v1/courses/${courseId}`, {
    method: "DELETE",
  });
}

export function fetchSharedCourseApi(
  shareToken: string,
): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(
    `/api/v1/courses/shared/${encodeURIComponent(shareToken)}`,
    {
      method: "GET",
    },
  );
}

export function updateCourseCollaboration(
  authenticatedFetch: AuthenticatedFetchFn,
  courseId: number,
  isCollabOpen: boolean,
): Promise<CourseDetail> {
  return authenticatedFetch<CourseDetail>(
    `/api/v1/courses/${courseId}/collaboration`,
    {
      method: "PATCH",
      body: { isCollabOpen },
    },
  );
}

export async function downloadCourseKml(
  accessToken: string,
  courseId: number,
  courseTitle: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/courses/${courseId}/export.kml`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    let errorPayload: ErrorResponse = {
      code: `HTTP_${response.status}`,
      message: "KML 파일을 내려받지 못했습니다.",
      timestamp: new Date().toISOString(),
    };
    try {
      const parsed = (await response.json()) as Partial<ErrorResponse>;
      if (parsed.code && parsed.message && parsed.timestamp) {
        errorPayload = {
          code: parsed.code,
          message: parsed.message,
          timestamp: parsed.timestamp,
        };
      }
    } catch {
      // ignore non-json
    }
    throw new ApiError(response.status, errorPayload);
  }

  const blob = await response.blob();
  const safeSlug = courseTitle
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 40);
  const filename = `${safeSlug || `dayt-course-${courseId}`}.kml`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
