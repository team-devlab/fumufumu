import "server-only";
import { cookies } from "next/headers";
import type { ConsultationListResponse } from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const fetchUserConsultationsApi = async (
  userId: number,
): Promise<ConsultationListResponse> => {
  const cookieStore = await cookies();
  return apiClient<ConsultationListResponse>(
    `/api/consultations?userId=${userId}`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
};

/**
 * 自分の相談の下書き一覧を取得する (server-only)
 *
 * 下書きは本人限定の非公開データ。backend は `draft=true` のとき userId を
 * 認証ユーザー本人へ強制するため、userId は渡さない (渡しても上書きされる)。
 * 個人の非公開データを共有キャッシュに乗せないよう no-store を明示する。
 */
export const fetchUserConsultationDraftsApi =
  async (): Promise<ConsultationListResponse> => {
    const cookieStore = await cookies();
    return apiClient<ConsultationListResponse>(
      "/api/consultations?draft=true",
      {
        method: "GET",
        headers: { Cookie: cookieStore.toString() },
        cache: "no-store",
      },
    );
  };
