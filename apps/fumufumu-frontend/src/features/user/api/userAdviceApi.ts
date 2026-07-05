import "server-only";
import { cookies } from "next/headers";
import type { AdviceListResponse } from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

/**
 * 自分のアドバイス一覧を相談横断で取得する (server-only)
 *
 * `userId` に本人のIDを渡す。`includeHidden` を付けないため、既定の GET /api/advices は
 * 「承認済み かつ 非表示でない」アドバイスのみを返す (プロフィールの承認済み一覧に一致)。
 * userId 指定時は backend 側で Cache-Control: no-store が付くが、
 * フロントでも共有キャッシュ露出を避けるため no-store を明示する。
 */
export const fetchUserAdvicesApi = async (
  userId: number,
): Promise<AdviceListResponse> => {
  const cookieStore = await cookies();
  return apiClient<AdviceListResponse>(`/api/advices?userId=${userId}`, {
    method: "GET",
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });
};

/**
 * 自分のアドバイスの下書き一覧を相談横断で取得する (server-only)
 *
 * 下書きは本人限定の非公開データ。backend は `draft=true` のとき userId を
 * 認証ユーザー本人へ強制するため、userId は渡さない (渡しても上書きされる)。
 * 個人の非公開データを共有キャッシュに乗せないよう no-store を明示する。
 */
export const fetchUserAdviceDraftsApi =
  async (): Promise<AdviceListResponse> => {
    const cookieStore = await cookies();
    return apiClient<AdviceListResponse>("/api/advices?draft=true", {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    });
  };
