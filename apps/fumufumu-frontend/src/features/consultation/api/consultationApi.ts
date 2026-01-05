import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";
import type { ConsultationListResponse } from "@/features/consultation/types";

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
