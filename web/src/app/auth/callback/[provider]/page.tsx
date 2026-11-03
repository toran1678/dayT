"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import type { OAuthProvider } from "@/shared/api/types";
import { useAuth } from "@/features/auth/AuthContext";

function parseProviderParam(
  raw: string | string[] | undefined,
): OAuthProvider | null {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  if (upper === "KAKAO" || upper === "GOOGLE") {
    return upper;
  }
  return null;
}

function OAuthCallbackHandler() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithOAuth } = useAuth();
  const handledRef = useRef(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);

  const provider = parseProviderParam(params.provider);
  const code = searchParams.get("code");
  const invalidRequestMessage =
    !provider || !code ? "유효하지 않은 소셜 인증 콜백 요청입니다." : null;

  useEffect(() => {
    if (!provider || !code || handledRef.current) return;
    handledRef.current = true;

    const redirectUri = `${window.location.origin}/auth/callback/${provider.toLowerCase()}`;

    void loginWithOAuth(provider, {
      authorizationCode: code,
      redirectUri,
    })
      .then(() => {
        router.replace("/");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setAsyncError(err.message);
        } else {
          setAsyncError("소셜 로그인 처리 중 문제가 발생했습니다.");
        }
      });
  }, [provider, code, loginWithOAuth, router]);

  const displayError = invalidRequestMessage ?? asyncError;

  if (displayError) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-sm font-extrabold text-red-600">{displayError}</p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="mt-4 rounded-full bg-surface-dark px-5 py-2 text-xs font-bold text-white"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="mt-3 text-sm font-extrabold text-foreground">
        소셜 계정으로 로그인하고 있어요...
      </p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthCallbackHandler />
    </Suspense>
  );
}
