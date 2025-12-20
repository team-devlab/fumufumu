const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type ApiOptions = RequestInit & {
  // 必要に応じて拡張
};

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
      // エラーレスポンスのパース（必要に応じて）
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    // レスポンスが空の場合はnullを返す等の処理も可能
    return response.json() as Promise<T>;
  } catch (error) {
    console.error("API Request Failed:", error);
    throw error;
  }
}
