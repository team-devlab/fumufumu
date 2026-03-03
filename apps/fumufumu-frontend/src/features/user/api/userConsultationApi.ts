import "server-only";
import { cookies } from "next/headers";
import type { ConsultationListResponse } from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const fetchUserConsultationsApi = async (
  userId: number,
): Promise<ConsultationListResponse> => {
  const cookieStore = await cookies();
  return apiClient<ConsultationListResponse>(
    `/api/consultations?userId=${userId}`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
};
