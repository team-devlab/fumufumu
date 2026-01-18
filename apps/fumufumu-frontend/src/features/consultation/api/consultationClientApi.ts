import { apiClient } from "@/lib/api/client";
import type {
  Consultation,
  CreateConsultationParams,
} from "@/features/consultation/types";

export const createConsultation = (params: CreateConsultationParams) => {
  return apiClient<Consultation>("/api/consultations", {
    method: "POST",
    body: JSON.stringify(params),
  });
};
