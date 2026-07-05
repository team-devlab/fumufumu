import type {
  Advice,
  AdviceSavedResponse,
  Consultation,
  ConsultationListResponse,
  ConsultationSavedResponse,
  CreateAdviceParams,
  CreateConsultationParams,
  UpdateConsultationParams,
} from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const createConsultation = (params: CreateConsultationParams) => {
  return apiClient<Consultation>("/api/consultations", {
    method: "POST",
    body: JSON.stringify(params),
  });
};

/**
 * 相談を更新する（下書きの編集・公開）。
 * tagIds を省略すると既存タグを保持、配列指定で総入れ替え（公開にはタグ1件以上が必要）。
 * 作成と異なり保存結果のみ（全文なし）を返す点に注意。
 */
export const updateConsultation = (
  id: number,
  params: UpdateConsultationParams,
) => {
  return apiClient<ConsultationSavedResponse>(`/api/consultations/${id}`, {
    method: "PUT",
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
 * アドバイスの下書きを更新する(本文のみ・draft維持)。
 * 同一相談に本人の複数アドバイスが併存し得るため、adviceId で更新対象を一意に特定する。
 * 作成と異なり保存結果のみ(全文なし)を返す。公開済み/他人の下書きは backend が 404 で拒否する。
 */
export const updateDraftAdvice = (adviceId: number, body: string) => {
  return apiClient<AdviceSavedResponse>(`/api/advices/${adviceId}/draft`, {
    method: "PUT",
    body: JSON.stringify({ body }),
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
