import "server-only";
import { cookies } from "next/headers";
import type {
  Consultation,
  ConsultationListResponse,
  CreateConsultationParams,
} from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const fetchConsultationsApi =
  async (): Promise<ConsultationListResponse> => {
    // ブラウザから送られてきたCookieを取得
    const cookieStore = await cookies();

    return apiClient<ConsultationListResponse>("/api/consultations", {
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
