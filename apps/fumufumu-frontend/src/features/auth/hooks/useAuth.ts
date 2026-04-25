"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/config/routes";
import type {
  SigninCredentials,
  SignupCredentials,
} from "@/features/auth/types";
import { ApiError } from "@/lib/api/client";
import { authApi } from "../api/authApi";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveReturnTo = (returnTo?: string | null) => {
    if (!returnTo) return ROUTES.CONSULTATION.LIST;
    if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
      return ROUTES.CONSULTATION.LIST;
    }
    return returnTo;
  };

  const signin = async (
    credentials: SigninCredentials,
    returnTo?: string | null,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signin(credentials);
      router.push(resolveReturnTo(returnTo));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(
          "ログインに失敗しました。メールアドレスまたはパスワードをご確認ください。",
        );
      } else {
        setError("ログインに失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    credentials: SignupCredentials,
    returnTo?: string | null,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signup(credentials);
      router.push(resolveReturnTo(returnTo));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "サインアップに失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const signout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signout();
      router.push("/login?reason=signed_out");
    } catch (_err) {
      setError("サインアウトに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const startGoogleAuth = async (returnTo?: string | null) => {
    setError(null);
    setIsLoading(true);

    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const absoluteReturnTo = `${window.location.origin}${resolveReturnTo(returnTo)}`;
      await authApi.startGoogleSignIn(absoluteReturnTo);
      // startGoogleSignIn 内で window.location.href を書き換えるため、以降は到達しない想定
    } catch (_err) {
      setError("Google認証に失敗しました。時間をおいて再度お試しください。");
      setIsLoading(false);
    }
  };

  return {
    signin,
    signup,
    signout,
    startGoogleAuth,
    isLoading,
    error,
  };
};
