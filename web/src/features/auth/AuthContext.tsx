"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiFetch, type ApiRequestOptions } from "@/shared/api/client";
import type {
  AuthTokenResponse,
  OAuthLoginRequest,
  OAuthProvider,
  UserSummary,
  UserUpdateRequest,
} from "@/shared/api/types";
import {
  getMyProfileApi,
  loginWithOAuthApi,
  logoutApi,
  refreshTokensApi,
  updateMyProfileApi,
} from "./auth-api";
import { AuthModals } from "./AuthModals";

const STORAGE_KEY = "dayt.auth.session";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: UserSummary | null;
  accessToken: string | null;
  isInitializing: boolean;
  isLoginModalOpen: boolean;
  isProfileModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  loginWithOAuth: (
    provider: OAuthProvider,
    payload: OAuthLoginRequest,
  ) => Promise<UserSummary>;
  updateProfile: (payload: UserUpdateRequest) => Promise<UserSummary>;
  refreshProfile: () => Promise<UserSummary | null>;
  logout: () => Promise<void>;
  authenticatedFetch: <TResponse>(
    endpoint: `/api/v1/${string}`,
    options?: Omit<ApiRequestOptions, "accessToken">,
  ) => Promise<TResponse>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string"
    ) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredTokens(tokens: StoredTokens | null): void {
  if (typeof window === "undefined") return;
  if (!tokens) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const applyAuthSession = useCallback((auth: AuthTokenResponse) => {
    const nextTokens: StoredTokens = {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    };
    writeStoredTokens(nextTokens);
    setTokens(nextTokens);
    setUser(auth.user);
  }, []);

  const clearAuthSession = useCallback(() => {
    writeStoredTokens(null);
    setTokens(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      const saved = readStoredTokens();
      if (!saved) {
        if (active) setIsInitializing(false);
        return;
      }

      try {
        const profile = await getMyProfileApi(saved.accessToken);
        if (active) {
          setTokens(saved);
          setUser(profile);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            const refreshed = await refreshTokensApi({
              refreshToken: saved.refreshToken,
            });
            if (active) {
              applyAuthSession(refreshed);
            }
          } catch {
            if (active) clearAuthSession();
          }
        } else if (active) {
          clearAuthSession();
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    }

    void bootstrapSession();
    return () => {
      active = false;
    };
  }, [applyAuthSession, clearAuthSession]);

  const loginWithOAuth = useCallback(
    async (
      provider: OAuthProvider,
      payload: OAuthLoginRequest,
    ): Promise<UserSummary> => {
      const auth = await loginWithOAuthApi(provider, payload);
      applyAuthSession(auth);
      setIsLoginModalOpen(false);
      return auth.user;
    },
    [applyAuthSession],
  );

  const authenticatedFetch = useCallback(
    async <TResponse,>(
      endpoint: `/api/v1/${string}`,
      options: Omit<ApiRequestOptions, "accessToken"> = {},
    ): Promise<TResponse> => {
      const current = tokens ?? readStoredTokens();
      if (!current) {
        setIsLoginModalOpen(true);
        throw new ApiError(401, {
          code: "UNAUTHORIZED",
          message: "로그인이 필요한 기능입니다.",
          timestamp: new Date().toISOString(),
        });
      }

      try {
        return await apiFetch<TResponse>(endpoint, {
          ...options,
          accessToken: current.accessToken,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            const refreshed = await refreshTokensApi({
              refreshToken: current.refreshToken,
            });
            applyAuthSession(refreshed);
            return await apiFetch<TResponse>(endpoint, {
              ...options,
              accessToken: refreshed.accessToken,
            });
          } catch (refreshErr) {
            clearAuthSession();
            setIsLoginModalOpen(true);
            throw refreshErr;
          }
        }
        throw err;
      }
    },
    [tokens, applyAuthSession, clearAuthSession],
  );

  const updateProfile = useCallback(
    async (payload: UserUpdateRequest): Promise<UserSummary> => {
      const current = tokens ?? readStoredTokens();
      if (!current) {
        throw new Error("로그인 상태가 아닙니다.");
      }
      const updated = await updateMyProfileApi(current.accessToken, payload);
      setUser(updated);
      return updated;
    },
    [tokens],
  );

  const refreshProfile = useCallback(async (): Promise<UserSummary | null> => {
    const current = tokens ?? readStoredTokens();
    if (!current) return null;
    try {
      const latest = await getMyProfileApi(current.accessToken);
      setUser(latest);
      return latest;
    } catch {
      return null;
    }
  }, [tokens]);

  const logout = useCallback(async () => {
    const current = tokens ?? readStoredTokens();
    try {
      if (current) {
        await logoutApi(current.accessToken);
      }
    } catch {
      // Clear local session regardless of server network error
    } finally {
      clearAuthSession();
      setIsProfileModalOpen(false);
    }
  }, [tokens, clearAuthSession]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: tokens?.accessToken ?? null,
      isInitializing,
      isLoginModalOpen,
      isProfileModalOpen,
      openLoginModal: () => setIsLoginModalOpen(true),
      closeLoginModal: () => setIsLoginModalOpen(false),
      openProfileModal: () => setIsProfileModalOpen(true),
      closeProfileModal: () => setIsProfileModalOpen(false),
      loginWithOAuth,
      updateProfile,
      refreshProfile,
      logout,
      authenticatedFetch,
    }),
    [
      user,
      tokens,
      isInitializing,
      isLoginModalOpen,
      isProfileModalOpen,
      loginWithOAuth,
      updateProfile,
      refreshProfile,
      logout,
      authenticatedFetch,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <AuthModals />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

