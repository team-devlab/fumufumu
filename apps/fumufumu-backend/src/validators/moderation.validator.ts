import { z } from "zod";
import type { ModerationTargetType } from "@/db/schema/moderation-actions";

const positiveIntegerStringSchema = z.coerce
  .number({ error: "正の整数を指定してください" })
  .int({ error: "正の整数を指定してください" })
  .positive({ error: "正の整数を指定してください" });

const TARGET_TYPE_PATH_TO_DB: Record<string, ModerationTargetType> = {
  consultations: "consultation",
  advices: "advice",
};

const targetTypePathSchema = z
  .enum(["consultations", "advices"], {
    error: "targetTypeはconsultationsまたはadvicesを指定してください",
  })
  .transform((value) => TARGET_TYPE_PATH_TO_DB[value]);

export const moderationTargetParamSchema = z.object({
  targetType: targetTypePathSchema,
  id: positiveIntegerStringSchema,
});

// hide-reasons のように :id を取らず targetType のみを path に持つエンドポイント用
export const moderationTargetTypeParamSchema = z.object({
  targetType: targetTypePathSchema,
});

// ?ids=1,2,3 をカンマ区切りの正の整数配列に変換する（content-check.validatorのidsパースと同型）。
// 非表示中タブの1ページ表示分をまとめて解決する用途なので、暴走防止に上限を設ける。
const MAX_HIDE_REASON_IDS = 100;
const commaSeparatedIdsSchema = z
  .string()
  .trim()
  .min(1, "idsは1件以上指定してください")
  .transform((value, ctx) => {
    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      ctx.addIssue({ code: "custom", message: "idsは1件以上指定してください" });
      return z.NEVER;
    }

    const parsedIds = parts.map((part) => Number(part));
    if (parsedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      ctx.addIssue({
        code: "custom",
        message: "idsは正の整数をカンマ区切りで指定してください",
      });
      return z.NEVER;
    }

    if (parsedIds.length > MAX_HIDE_REASON_IDS) {
      ctx.addIssue({
        code: "custom",
        message: `idsは${MAX_HIDE_REASON_IDS}件以内で指定してください`,
      });
      return z.NEVER;
    }

    // 重複は1回に畳んでおく（同一idへの重複クエリを避ける）
    return [...new Set(parsedIds)];
  });

export const hideReasonsQuerySchema = z.object({
  ids: commaSeparatedIdsSchema,
});

export const hideModerationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "理由は1文字以上で入力してください")
    .max(500, "理由は500文字以内で入力してください")
    .optional(),
  skipAuditLog: z.boolean().optional().default(false),
});

export const unhideModerationSchema = z.object({
  skipAuditLog: z.boolean().optional().default(false),
});

export type ModerationTargetParam = z.infer<typeof moderationTargetParamSchema>;
export type ModerationTargetTypeParam = z.infer<typeof moderationTargetTypeParamSchema>;
export type HideReasonsQuery = z.infer<typeof hideReasonsQuerySchema>;
export type HideModerationInput = z.infer<typeof hideModerationSchema>;
export type UnhideModerationInput = z.infer<typeof unhideModerationSchema>;
