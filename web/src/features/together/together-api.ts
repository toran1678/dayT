import type { ApiRequestOptions } from "@/shared/api/client";
import type {
  CoupleConnectRequest,
  CoupleInviteResponse,
  CouplePetResponse,
  CoupleSummary,
  DailyMissionItem,
} from "@/shared/api/types";

export type AuthenticatedFetchFn = <TResponse>(
  endpoint: `/api/v1/${string}`,
  options?: Omit<ApiRequestOptions, "accessToken">,
) => Promise<TResponse>;

export const PET_UPDATED_EVENT = "dayt:pet-updated";

export function dispatchPetUpdated(pet: CouplePetResponse): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CouplePetResponse>(PET_UPDATED_EVENT, { detail: pet }));
}

export function createOrGetCoupleInviteApi(
  authenticatedFetch: AuthenticatedFetchFn,
): Promise<CoupleInviteResponse> {
  return authenticatedFetch<CoupleInviteResponse>("/api/v1/couples/invite", {
    method: "POST",
  });
}

export function connectCoupleApi(
  authenticatedFetch: AuthenticatedFetchFn,
  payload: CoupleConnectRequest,
): Promise<CoupleSummary> {
  return authenticatedFetch<CoupleSummary>("/api/v1/couples/connect", {
    method: "POST",
    body: payload,
  });
}

export function fetchMyPetApi(
  authenticatedFetch: AuthenticatedFetchFn,
): Promise<CouplePetResponse> {
  return authenticatedFetch<CouplePetResponse>("/api/v1/pets/me", {
    method: "GET",
  });
}

export async function checkInPetTodayApi(
  authenticatedFetch: AuthenticatedFetchFn,
): Promise<CouplePetResponse> {
  const updated = await authenticatedFetch<CouplePetResponse>(
    "/api/v1/pets/check-in",
    {
      method: "POST",
    },
  );
  dispatchPetUpdated(updated);
  return updated;
}

export function fetchTodayMissionsApi(
  authenticatedFetch: AuthenticatedFetchFn,
): Promise<DailyMissionItem[]> {
  return authenticatedFetch<DailyMissionItem[]>("/api/v1/missions/today", {
    method: "GET",
  });
}

export function completeDailyMissionApi(
  authenticatedFetch: AuthenticatedFetchFn,
  missionLogId: number,
): Promise<DailyMissionItem> {
  return authenticatedFetch<DailyMissionItem>(
    `/api/v1/missions/${missionLogId}/complete`,
    {
      method: "POST",
    },
  );
}

