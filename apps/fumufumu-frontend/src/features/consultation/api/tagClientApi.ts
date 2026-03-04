import type { TagListResponse } from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";

export const fetchTags = () => {
  return apiClient<TagListResponse>("/api/tags", {
    method: "GET",
  });
};
