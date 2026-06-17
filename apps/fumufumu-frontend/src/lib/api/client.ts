import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

// `??` で nullish (undefined) 時のみ localhost に fallback する。
// production build では `.env.production.local` で空文字を inline して同一 origin の
// 相対パス fetch にしたいケースがあり、`||` だと空文字を falsy として扱い localhost に
// fallback してしまうため `??` を使う（Service Binding 経由の同一 origin 構成、#126）。
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

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
          // window.location 代入だけでは処理が止まらないため、caller の catch に流さない。
          return new Promise(() => {});
        } else {
          const { headers } = await import("next/headers");
          const headersList = await headers();
          // 注: 旧 proxy.ts が設定していた x-pathname は撤去されたため、
          //     現状この値は常に undefined になり SSR 経由の returnTo 復元は機能しない。
          //     OpenNext for Cloudflare の Node Middleware 非対応制約への対応として、
          //     別途 layout / page 側で returnTo を構築する設計を後続 issue で扱う。
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
