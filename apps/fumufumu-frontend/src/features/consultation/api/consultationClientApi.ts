import type {
  Advice,
  Consultation,
  ConsultationListResponse,
  CreateAdviceParams,
  CreateConsultationParams,
} from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const createConsultation = (params: CreateConsultationParams) => {
  return apiClient<Consultation>("/api/consultations", {
    method: "POST",
    body: JSON.stringify(params),
  });
};

export const createAdvice = ({
  consultationId,
  body,
  draft,
}: CreateAdviceParams) => {
  return apiClient<Advice>(`/api/consultations/${consultationId}/advice`, {
    method: "POST",
    body: JSON.stringify({ body, draft }),
  });
};

/**
 * 相談一覧をクライアントサイドから取得する（無限スクロール用）
 * - skipAuthRedirect: true → 401 は ApiError としてスロー（hook 側で処理）
 * - signal: AbortController で in-flight リクエストを中断可能
 */
export const fetchConsultationsClient = (
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<ConsultationListResponse> => {
  return apiClient<ConsultationListResponse>(
    `/api/consultations?page=${page}&limit=${limit}`,
    { method: "GET", skipAuthRedirect: true, signal },
  );
};
