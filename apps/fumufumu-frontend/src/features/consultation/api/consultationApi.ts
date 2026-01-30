import "server-only";
import { cookies } from "next/headers";
import type {
  Consultation,
  ConsultationDetail,
  ConsultationListResponse,
  CreateConsultationParams,
} from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const fetchConsultationsApi =
  async (): Promise<ConsultationListResponse> => {
    const cookieStore = await cookies();
    return apiClient<ConsultationListResponse>("/api/consultations", {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    });
  };

/**
 * 相談詳細を取得する (Server Side)
 */
export const fetchConsultationDetailApi = async (
  id: string,
): Promise<ConsultationDetail> => {
  const cookieStore = await cookies();

  // APIからは現状の型（Consultation型に近いもの）が返ってくる
  const data = await apiClient<any>(`/api/consultations/${id}`, {
    method: "GET",
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store", // 詳細画面は常に最新を見たいのでキャッシュなし
  });

  // フロントエンドの型定義(ConsultationDetail)に合わせてデータを補完
  // ※バックエンド改修までの暫定対応
  return {
    ...data,
    body: data.body || data.body_preview || "",
    advices: data.advices || [],
  };
};

export const createConsultationApi = async (
  params: CreateConsultationParams,
): Promise<Consultation> => {
  return apiClient<Consultation>("/api/consultations", {
    method: "POST",
    body: JSON.stringify(params),
  });
};
