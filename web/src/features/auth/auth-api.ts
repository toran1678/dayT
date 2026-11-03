import { apiFetch } from "@/shared/api/client";
import type {
  AuthTokenResponse,
  OAuthLoginRequest,
  OAuthProvider,
  TokenRefreshRequest,
  UserSummary,
  UserUpdateRequest,
} from "@/shared/api/types";

export function loginWithOAuthApi(
  provider: OAuthProvider,
  payload: OAuthLoginRequest,
): Promise<AuthTokenResponse> {
  return apiFetch<AuthTokenResponse>(`/api/v1/auth/oauth/${provider}`, {
    method: "POST",
    body: payload,
  });
}

export function refreshTokensApi(
  payload: TokenRefreshRequest,
): Promise<AuthTokenResponse> {
  return apiFetch<AuthTokenResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: payload,
  });
}

export function logoutApi(accessToken: string): Promise<void> {
  return apiFetch<void>("/api/v1/auth/logout", {
    method: "POST",
    accessToken,
  });
}

export function getMyProfileApi(accessToken: string): Promise<UserSummary> {
  return apiFetch<UserSummary>("/api/v1/users/me", {
    method: "GET",
    accessToken,
  });
}

export function updateMyProfileApi(
  accessToken: string,
  payload: UserUpdateRequest,
): Promise<UserSummary> {
  return apiFetch<UserSummary>("/api/v1/users/me", {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

function isRealClientId(val: string | undefined): val is string {
  return Boolean(val && val.trim() && !val.startsWith("your_"));
}

export function buildOAuthAuthorizeUrl(
  provider: OAuthProvider,
  origin: string,
): string | null {
  const redirectUri = `${origin}/auth/callback/${provider.toLowerCase()}`;

  if (provider === "KAKAO") {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    if (!isRealClientId(clientId)) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
    });
    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!isRealClientId(clientId)) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

