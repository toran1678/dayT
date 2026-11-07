import { apiFetch, type ApiRequestOptions } from "@/shared/api/client";
import type {
  CourseDetail,
  CourseListItem,
  CourseRecommendationPreview,
  CourseRecommendRequest,
  CourseUpsertRequest,
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
