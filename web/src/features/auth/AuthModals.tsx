"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2, LogOut, Sparkles, UserRound, X } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import type { OAuthProvider } from "@/shared/api/types";
import { buildOAuthAuthorizeUrl } from "./auth-api";
import { useAuth } from "./AuthContext";

type DevSeedPreset = "dayt" | "partner";

function KakaoSymbol() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1.5C4.30558 1.5 0.5 4.44729 0.5 8.08297C0.5 10.4272 2.08074 12.4856 4.46289 13.6498L3.45577 17.3455C3.36686 17.6718 3.73936 17.9317 4.02472 17.7418L8.43572 14.8058C8.62217 14.8191 8.81036 14.8259 9 14.8259C13.6944 14.8259 17.5 11.8786 17.5 8.08297C17.5 4.44729 13.6944 1.5 9 1.5Z"
        fill="#000000"
      />
    </svg>
  );
}

function GoogleSymbol() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthModals() {
  const {
    user,
    isLoginModalOpen,
    isProfileModalOpen,
    closeLoginModal,
    closeProfileModal,
  } = useAuth();

  return (
    <>
      {isLoginModalOpen && <LoginDialog onClose={closeLoginModal} />}
      {isProfileModalOpen && user && (
        <ProfileDialog onClose={closeProfileModal} />
      )}
    </>
  );
}

function hasAnyMissingOAuthKey(): boolean {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const kakaoReady = Boolean(
    kakaoKey && kakaoKey.trim() && !kakaoKey.startsWith("your_"),
  );
  const googleReady = Boolean(
    googleKey && googleKey.trim() && !googleKey.startsWith("your_"),
  );
  return !kakaoReady || !googleReady;
}

function LoginDialog({ onClose }: { onClose: () => void }) {
  const { loginWithOAuth } = useAuth();
  const [devSeed, setDevSeed] = useState<DevSeedPreset>("dayt");
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showDevPresetBox = hasAnyMissingOAuthKey();

  async function handleProviderClick(provider: OAuthProvider) {
    setErrorMessage(null);
    const authorizeUrl = buildOAuthAuthorizeUrl(
      provider,
      window.location.origin,
    );

    if (authorizeUrl) {
      window.location.href = authorizeUrl;
      return;
    }

    // Local development fallback using real backend POST /api/v1/auth/oauth/{provider}
    setLoadingProvider(provider);
    try {
      await loginWithOAuth(provider, {
        authorizationCode: `dev:${devSeed}`,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "백엔드 서버에 연결할 수 없습니다. Spring Boot 서버가 실행 중인지 확인해주세요.",
        );
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dayt-login-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>3초 소셜 로그인</span>
        </div>

        <h2
          id="dayt-login-title"
          className="mt-3 text-2xl font-black tracking-tight text-foreground"
        >
          Day<span className="text-primary">T</span>에서 오늘의 코스를 저장해요
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          로그인하면 나만의 데이트 코스를 보관하고 연인과 커플 스페이스·일기장을 함께 사용할 수 있습니다.
        </p>

        {/* Official Kakao & Google Brand Guideline Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => void handleProviderClick("KAKAO")}
            className="relative flex h-12 w-full cursor-pointer items-center justify-center rounded-[12px] bg-[#FEE500] px-4 text-[15px] font-semibold text-black/85 transition-colors hover:bg-[#FDD800] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute left-4 flex items-center">
              {loadingProvider === "KAKAO" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin text-black/85" />
              ) : (
                <KakaoSymbol />
              )}
            </span>
            <span>카카오로 계속하기</span>
          </button>

          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => void handleProviderClick("GOOGLE")}
            className="relative flex h-12 w-full cursor-pointer items-center justify-center rounded-[12px] border border-[#DADCE0] bg-white px-4 text-[15px] font-semibold text-[#1F1F1F] transition-colors hover:bg-[#F8FAFD] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute left-4 flex items-center">
              {loadingProvider === "GOOGLE" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin text-[#4285F4]" />
              ) : (
                <GoogleSymbol />
              )}
            </span>
            <span>Google로 계속하기</span>
          </button>
        </div>

        {showDevPresetBox && (
          <div className="mt-5 rounded-2xl bg-surface-subtle/80 p-3.5">
            <p className="text-[11px] font-bold text-foreground">
              로컬 개발 간편 인증 프리셋
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              OAuth 콘솔 키 미설정 상태에서는 클릭 시 아래 테스트 계정으로 바로 로그인됩니다.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDevSeed("dayt")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  devSeed === "dayt"
                    ? "bg-surface-dark text-white"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                계정 A (기본 내 계정)
              </button>
              <button
                type="button"
                onClick={() => setDevSeed("partner")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  devSeed === "partner"
                    ? "bg-surface-dark text-white"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                계정 B (연인 테스트용)
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, logout } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(
    user?.profileImageUrl ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!user) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSavedNotice(false);
    setIsSaving(true);

    try {
      await updateProfile({
        nickname: nickname.trim(),
        profileImageUrl: profileImageUrl.trim() || null,
      });
      setSavedNotice(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("프로필 수정 중 오류가 발생했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dayt-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-subtle hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="dayt-profile-title"
                className="text-lg font-black text-foreground"
              >
                내 프로필 설정
              </h2>
              <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-extrabold text-muted">
                {user.oauthProvider}
              </span>
            </div>
            <p className="text-xs text-muted">
              {user.email ?? "이메일 미등록"} ·{" "}
              {user.coupleId ? `커플 #${user.coupleId} 연결됨` : "솔로 모드"}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="profile-nickname"
              className="block text-xs font-bold text-foreground"
            >
              닉네임 (최대 50자)
            </label>
            <input
              id="profile-nickname"
              type="text"
              required
              maxLength={50}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="profile-image-url"
              className="block text-xs font-bold text-foreground"
            >
              프로필 이미지 URL (선택)
            </label>
            <input
              id="profile-image-url"
              type="url"
              placeholder="https://example.com/profile.jpg"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600">
              {errorMessage}
            </p>
          )}

          {savedNotice && (
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              <span>프로필이 저장되었습니다.</span>
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-muted transition-colors hover:border-red-300 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>로그아웃</span>
            </button>

            <button
              type="submit"
              disabled={isSaving || !nickname.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>변경사항 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
