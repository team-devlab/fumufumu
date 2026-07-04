import { apiClient } from "@/lib/api/client";
import type { ModerationActionResponse, ModerationTargetType } from "../types";

export const hideModerationTargetApi = (
  targetType: ModerationTargetType,
  id: number,
  reason: string | undefined,
  skipAuditLog: boolean,
) => {
  return apiClient<ModerationActionResponse>(
    `/api/admin/moderation/${targetType}/${id}/hide`,
    {
      method: "POST",
      body: JSON.stringify({ reason, skipAuditLog }),
    },
  );
};

export const unhideModerationTargetApi = (
  targetType: ModerationTargetType,
  id: number,
  skipAuditLog: boolean,
) => {
  return apiClient<ModerationActionResponse>(
    `/api/admin/moderation/${targetType}/${id}/unhide`,
    {
      method: "POST",
      body: JSON.stringify({ skipAuditLog }),
    },
  );
};
