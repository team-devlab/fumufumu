import type {
  Advice,
  Consultation,
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
