import { z } from "zod";

const positiveIntegerStringSchema = z.coerce
  .number({ error: "正の整数を指定してください" })
  .int({ error: "正の整数を指定してください" })
  .positive({ error: "正の整数を指定してください" });

const commaSeparatedIdsSchema = z
  .string()
  .trim()
  .min(1, "idsは1件以上指定してください")
  .transform((value, ctx) => {
    const parts = value.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
    if (parts.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "idsは1件以上指定してください",
      });
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

    return parsedIds;
  });

const listContentChecksQuerySchema = z
  .object({
    view: z.enum(["summary", "detail"]).optional().default("summary"),
    ids: commaSeparatedIdsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.view === "detail" && (!data.ids || data.ids.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["ids"],
        message: "view=detail の場合は ids が必須です",
      });
    }
  });

export const listConsultationContentChecksQuerySchema = listContentChecksQuerySchema;
export const listAdviceContentChecksQuerySchema = listContentChecksQuerySchema;

export const consultationIdParamSchema = z.object({
  consultationId: positiveIntegerStringSchema,
});

export const decideConsultationContentCheckSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().min(1, "却下時は理由を入力してください").max(500, "理由は500文字以内で入力してください").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "rejected" && !data.reason) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "却下時は理由を入力してください",
      });
    }
  });

export type ListConsultationContentChecksQuery = z.infer<typeof listConsultationContentChecksQuerySchema>;
export type ListAdviceContentChecksQuery = z.infer<typeof listAdviceContentChecksQuerySchema>;
export type ConsultationIdParam = z.infer<typeof consultationIdParamSchema>;
export type DecideConsultationContentCheckInput = z.infer<typeof decideConsultationContentCheckSchema>;
