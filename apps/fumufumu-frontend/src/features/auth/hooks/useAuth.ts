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

  return {
    signin,
    signup,
    isLoading,
    error,
  };
};
