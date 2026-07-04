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

export const moderationTargetParamSchema = z.object({
  targetType: z
    .enum(["consultations", "advices"], {
      error: "targetTypeはconsultationsまたはadvicesを指定してください",
    })
    .transform((value) => TARGET_TYPE_PATH_TO_DB[value]),
  id: positiveIntegerStringSchema,
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
export type HideModerationInput = z.infer<typeof hideModerationSchema>;
export type UnhideModerationInput = z.infer<typeof unhideModerationSchema>;
