import "server-only";
import { apiClient } from "@/lib/api/client";
import { ConsultationListResponse } from "../types";

export const fetchConsultationsApi = async (): Promise<ConsultationListResponse> => {
  // 実APIのエンドポイントを指定 (バックエンドの実装に合わせてパスは調整してください)
  return apiClient<ConsultationListResponse>("/api/consultations", {
    method: "GET",
    // Next.jsのキャッシュを無効化して常に最新を取得する場合
    cache: "no-store", 
  });
};
