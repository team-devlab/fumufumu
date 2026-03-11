import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type ApiOptions = RequestInit & {
  // 必要に応じて拡張
};

function buildLoginUrl(returnTo?: string): string {
  const params = new URLSearchParams();
  params.set("reason", "session_expired");
  if (returnTo) params.set("returnTo", returnTo);
  return `/login?${params.toString()}`;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const url = `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // これが最重要：異なるドメイン間でCookie（セッションID）を自動送受信する設定
    credentials: "include",
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = buildLoginUrl(window.location.pathname);
        } else {
          const { headers } = await import("next/headers");
          const headersList = await headers();
          const returnTo = headersList.get("x-pathname") || undefined;
          redirect(buildLoginUrl(returnTo));
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    // レスポンスが空の場合はnullを返す等の処理も可能
    return response.json() as Promise<T>;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("API Request Failed:", error);
    throw error;
  }
}
