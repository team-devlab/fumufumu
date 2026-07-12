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
      // signin は skipAuthRedirect:true のため apiClient はリダイレクトせず ApiError を投げる。
      // 無効化(403 account_disabled)はログイン画面に留めて理由を明示する(#136)。
      if (err instanceof ApiError && err.code === "account_disabled") {
        setError("このアカウントは無効化されています。");
      } else if (err instanceof ApiError && err.status === 401) {
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

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signup(credentials);
      router.push(ROUTES.CONSULTATION.LIST);
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

  return {
    signin,
    signup,
    signout,
    isLoading,
    error,
  };
};
