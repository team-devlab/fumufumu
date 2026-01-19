import type {
  Consultation,
  CreateConsultationParams,
} from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const createConsultation = (params: CreateConsultationParams) => {
  return apiClient<Consultation>("/api/consultations", {
    method: "POST",
    body: JSON.stringify(params),
  });
};
