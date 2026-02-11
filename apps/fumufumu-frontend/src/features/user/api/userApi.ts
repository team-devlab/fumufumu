import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";
import type { User } from "../types";

export const fetchCurrentUserApi = async (): Promise<User | null> => {
  try {
    const cookieStore = await cookies();
    return await apiClient<User>("/api/users/me", {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    });
  } catch (error) {
    // 未ログインやエラー時はnullを返して処理を継続させる（画面側で判断）
    // console.warn("Failed to fetch current user:", error);
    return null;
  }
};
