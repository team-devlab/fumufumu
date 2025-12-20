"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authApi";
import type { SigninCredentials, SignupCredentials } from "@/features/auth/types";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signin = async (credentials: SigninCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signin(credentials);
      // ログイン成功後はメイン画面へ遷移
      router.push('/experiment'); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.signup(credentials);
      router.push('/experiment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サインアップに失敗しました');
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
