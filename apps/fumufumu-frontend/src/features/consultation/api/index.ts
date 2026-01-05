import "server-only";
import { fetchConsultationsApi } from "@/features/consultation/api/consultationApi";
import { fetchConsultationsMock } from "@/features/consultation/api/mockApi";
import type { ConsultationListResponse } from "@/features/consultation/types";

/**
 * 相談一覧を取得する
 * 環境変数 USE_MOCK_API が "true" の場合はモックデータを返し、
 * それ以外の場合は実APIを呼び出します。
 */
export const fetchConsultations =
  async (): Promise<ConsultationListResponse> => {
    const useMock = process.env.USE_MOCK_API === "true";

    if (useMock) {
      console.log("⚠️ Using Mock API for Consultations");
      return fetchConsultationsMock();
    }

    return fetchConsultationsApi();
  };
