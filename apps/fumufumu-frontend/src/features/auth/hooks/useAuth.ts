"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  SigninCredentials,
  SignupCredentials,
} from "@/features/auth/types";
import { authApi } from "../api/authApi";
import { ROUTES } from "@/config/routes";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signin = async (credentials: SigninCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signin(credentials);
      router.push(ROUTES.CONSULTATION.LIST);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
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
