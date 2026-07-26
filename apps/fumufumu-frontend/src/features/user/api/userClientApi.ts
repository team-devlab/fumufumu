import { apiClient } from "@/lib/api/client";

/**
 * 退会（アカウント削除・PII 消去）を実行する。
 *
 * type-to-confirm の email 照合はバックエンドが行う（不一致は 400、管理者は 403）。
 * CSRF(Origin 検証) を満たすためブラウザから呼ぶ必要がある（サーバー fetch は Origin が無く弾かれる）。
 * 成功時はサーバーが Set-Cookie でセッションをクリアする。
 * skipAuthRedirect: 退会直後の 401 自動リダイレクトに任せず、成否は呼び出し側で扱う。
 */
export const withdrawAccount = (email: string) => {
  return apiClient<{ message: string }>("/api/users/me", {
    method: "DELETE",
    body: JSON.stringify({ email }),
    skipAuthRedirect: true,
  });
};
