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

  return apiClient<ConsultationDetail>(`/api/consultations/${id}`, {
    method: "GET",
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });
};

export const createConsultationApi = async (
  params: CreateConsultationParams,
): Promise<Consultation> => {
  return apiClient<Consultation>("/api/consultations", {
    method: "POST",
    body: JSON.stringify(params),
  });
};
