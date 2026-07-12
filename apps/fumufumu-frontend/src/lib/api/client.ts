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
  // backend が返す機械可読なエラーコード(例: 'account_disabled')。
  // status だけでは区別できない 403 の種類(無効化 vs 権限不足)を caller が判定するために保持する。
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function buildLoginUrl(reason: string, returnTo?: string): string {
  const params = new URLSearchParams();
  params.set("reason", reason);
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
      const errorData = await response.json().catch(() => ({}));
      const code =
        typeof errorData.code === "string" ? errorData.code : undefined;

      // 401: セッション切れ/未認証 → ログイン画面へ戻す(既存導線)。
      if (response.status === 401 && !skipAuthRedirect) {
        if (typeof window !== "undefined") {
          const returnTo = `${window.location.pathname}${window.location.search}`;
          window.location.href = buildLoginUrl("session_expired", returnTo);
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
          redirect(buildLoginUrl("session_expired", returnTo));
        }
      }

      // 403 + account_disabled: アカウント無効化(BAN)。権限不足の 403(ForbiddenError 等)とは
      // 区別する必要があるため status ではなく code で判定する(人間向け文言の変更にも強い, #136)。
      // 無効化された旨を伝えるためログイン画面へ戻す。returnTo は無意味なので付けない。
      if (
        response.status === 403 &&
        code === "account_disabled" &&
        !skipAuthRedirect
      ) {
        if (typeof window !== "undefined") {
          // セッション自体は有効なため、ログイン画面へ戻す前に Cookie を破棄する。
          // 残すと (main) layout の Cookie 有無ガードを通過し、ページ内 fetch の 403 と
          // 往復し続けるため。破棄は best-effort(失敗してもリダイレクトは行う)。
          await fetch(`${API_URL}/api/auth/signout`, {
            method: "POST",
            credentials: "include",
          }).catch(() => {});
          window.location.href = buildLoginUrl("account_disabled");
          return new Promise(() => {});
        } else {
          // SSR では Cookie 破棄ができないためリダイレクトのみ。
          // 次に (main) へ遷移した際、ブラウザ側の同経路が Cookie を破棄する。
          redirect(buildLoginUrl("account_disabled"));
        }
      }

      const message =
        typeof errorData.error === "string"
          ? errorData.error
          : `API Error: ${response.status}`;
      throw new ApiError(response.status, message, code);
    }

    // レスポンスが空の場合はnullを返す等の処理も可能
    return response.json() as Promise<T>;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("API Request Failed:", error);
    throw error;
  }
}
