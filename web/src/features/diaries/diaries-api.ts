import type { ApiRequestOptions } from "@/shared/api/client";
import type { DiaryDetail, DiaryUpsertRequest } from "@/shared/api/types";

export type AuthenticatedFetchFn = <TResponse>(
  endpoint: `/api/v1/${string}`,
  options?: Omit<ApiRequestOptions, "accessToken">,
) => Promise<TResponse>;

export function fetchDiariesApi(
  authenticatedFetch: AuthenticatedFetchFn,
  page = 0,
  size = 20,
): Promise<DiaryDetail[]> {
  return authenticatedFetch<DiaryDetail[]>(
    `/api/v1/diaries?page=${page}&size=${size}`,
    {
      method: "GET",
    },
  );
}

export function createDiaryApi(
  authenticatedFetch: AuthenticatedFetchFn,
  payload: DiaryUpsertRequest,
): Promise<DiaryDetail> {
  return authenticatedFetch<DiaryDetail>("/api/v1/diaries", {
    method: "POST",
    body: payload,
  });
}

export function updateDiaryApi(
  authenticatedFetch: AuthenticatedFetchFn,
  diaryId: number,
  payload: DiaryUpsertRequest,
): Promise<DiaryDetail> {
  return authenticatedFetch<DiaryDetail>(`/api/v1/diaries/${diaryId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteDiaryApi(
  authenticatedFetch: AuthenticatedFetchFn,
  diaryId: number,
): Promise<void> {
  return authenticatedFetch<void>(`/api/v1/diaries/${diaryId}`, {
    method: "DELETE",
  });
}

