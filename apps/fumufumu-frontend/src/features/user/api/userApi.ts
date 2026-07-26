import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";
import type { User, WithdrawalPreview } from "../types";

export const fetchCurrentUserApi = async (): Promise<User | null> => {
  try {
    const cookieStore = await cookies();
    return await apiClient<User>("/api/users/me", {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return null;
  }
};

/**
 * 退会プレビュー（削除/匿名化件数）をサーバーコンポーネントから取得する。
 * GET は副作用が無く CSRF 不要のためサーバー側で cookie を転送して取得できる。
 */
export const fetchWithdrawalPreviewApi =
  async (): Promise<WithdrawalPreview | null> => {
    try {
      const cookieStore = await cookies();
      return await apiClient<WithdrawalPreview>(
        "/api/users/me/withdrawal-preview",
        {
          method: "GET",
          headers: { Cookie: cookieStore.toString() },
          cache: "no-store",
        },
      );
    } catch (error) {
      if (isRedirectError(error)) throw error;
      return null;
    }
  };
