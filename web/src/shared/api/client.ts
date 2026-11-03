import type { ErrorResponse } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:18080";

export const WS_COLLAB_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:18080/ws/collab";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly timestamp: string;

  constructor(status: number, payload: ErrorResponse) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.timestamp = payload.timestamp;
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.timestamp === "string"
  );
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  accessToken?: string | null;
  body?: unknown;
}

export async function apiFetch<TResponse>(
  endpoint: `/api/v1/${string}`,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { accessToken, body, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let parsedError: unknown = null;
    try {
      parsedError = await response.json();
    } catch {
      // Non-JSON error fallback
    }

    if (isErrorResponse(parsedError)) {
      throw new ApiError(response.status, parsedError);
    }

    throw new ApiError(response.status, {
      code: `HTTP_${response.status}`,
      message: response.statusText || "요청을 처리하는 중 오류가 발생했습니다.",
      timestamp: new Date().toISOString(),
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

