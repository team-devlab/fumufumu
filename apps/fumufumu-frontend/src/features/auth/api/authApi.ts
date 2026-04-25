import type {
  AuthResponse,
  SigninCredentials,
  SignoutResponse,
  SignupCredentials,
} from "@/features/auth/types";
import { apiClient } from "@/lib/api/client";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"
).replace(/\/$/, "");

export const authApi = {
  signup: (data: SignupCredentials) => {
    return apiClient<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuthRedirect: true,
    });
  },

  signin: (data: SigninCredentials) => {
    return apiClient<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuthRedirect: true,
    });
  },

  signout: () => {
    return apiClient<SignoutResponse>("/api/auth/signout", {
      method: "POST",
      skipAuthRedirect: true,
    });
  },

  /**
   * Google ログインを開始する。
   * Better Auth 組み込みの /api/auth/sign-in/social を叩き、返却された URL に遷移する。
   */
  startGoogleSignIn: async (callbackURL: string): Promise<void> => {
    const origin = new URL(callbackURL).origin;
    // キャンセル / 認可失敗時は Better Auth のデフォルトエラーページではなく
    // ログイン画面に戻して理由を表示する。
    const errorCallbackURL = `${origin}/login?reason=oauth_failed`;

    const res = await fetch(`${API_URL}/api/auth/sign-in/social`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL,
        errorCallbackURL,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to initiate Google sign-in");
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      throw new Error("Google sign-in URL was not returned");
    }

    window.location.href = data.url;
  },
};
