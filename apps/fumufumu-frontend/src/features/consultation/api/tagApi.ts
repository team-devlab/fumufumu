import "server-only";
import { cookies } from "next/headers";
import type { TagListResponse } from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const fetchTagsApi = async (): Promise<TagListResponse> => {
  const cookieStore = await cookies();
  return apiClient<TagListResponse>("/api/tags", {
    method: "GET",
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });
};
