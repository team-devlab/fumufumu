import "server-only";
import { cookies } from "next/headers"; // 👈 追加
import { apiClient } from "@/lib/api/client";
import { ConsultationListResponse } from "../types";

export const fetchConsultationsApi = async (): Promise<ConsultationListResponse> => {
  // ブラウザから送られてきたCookieを取得
  const cookieStore = await cookies();

  return apiClient<ConsultationListResponse>("/api/consultations", {
    method: "GET",
    headers: {
      // 取得したCookieを文字列としてヘッダーにセット（これでバックエンドに認証情報が渡る）
      Cookie: cookieStore.toString(), 
    },
    cache: "no-store", 
  });
};