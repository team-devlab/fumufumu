import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type ApiOptions = RequestInit & {
  // 401時のログイン画面リダイレクトを無効化する（認証API呼び出し等で利用）
  skipAuthRedirect?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
  const { skipAuthRedirect = false, ...requestOptions } = options;
  const url = `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...requestOptions,
    headers: {
      ...defaultHeaders,
      ...requestOptions.headers,
    },
    // これが最重要：異なるドメイン間でCookie（セッションID）を自動送受信する設定
    credentials: "include",
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401 && !skipAuthRedirect) {
        if (typeof window !== "undefined") {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          window.location.href = buildLoginUrl(returnTo);
        } else {
          const { headers } = await import("next/headers");
          const headersList = await headers();
          const returnTo = headersList.get("x-pathname") || undefined;
          redirect(buildLoginUrl(returnTo));
        }
      }

      const errorData = await response.json().catch(() => ({}));
      const message =
        typeof errorData.error === "string"
          ? errorData.error
          : `API Error: ${response.status}`;
      throw new ApiError(response.status, message);
    }

    // レスポンスが空の場合はnullを返す等の処理も可能
    return response.json() as Promise<T>;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("API Request Failed:", error);
    throw error;
  }
}
