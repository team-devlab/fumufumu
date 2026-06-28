import { apiClient } from "@/lib/api/client";

type DecideConsultationContentCheckResponse = {
  consultation_id: number;
  status: "approved" | "rejected";
  reason: string | null;
  checked_at: string | null;
  updated_at: string;
};

type DecideAdviceContentCheckResponse = {
  advice_id: number;
  status: "approved" | "rejected";
  reason: string | null;
  checked_at: string | null;
  updated_at: string;
};

export const decideConsultationApi = (
  consultationId: number,
  decision: "approved" | "rejected",
  reason?: string,
) => {
  return apiClient<DecideConsultationContentCheckResponse>(
    `/api/admin/content-check/consultations/${consultationId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    },
  );
};

export const decideAdviceApi = (
  adviceId: number,
  decision: "approved" | "rejected",
  reason?: string,
) => {
  return apiClient<DecideAdviceContentCheckResponse>(
    `/api/admin/content-check/advices/${adviceId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    },
  );
};
