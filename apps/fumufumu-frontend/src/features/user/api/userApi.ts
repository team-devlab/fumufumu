import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect-error";
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
    if (isRedirectError(error)) throw error;
    return null;
  }
};
