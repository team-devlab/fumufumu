import { z } from "zod";
import { PAGINATION_CONFIG } from "@/types/consultation.types";
import {
	CONSULTATION_TAG_RULE_MESSAGES,
	getConsultationTagRuleError,
} from "@/rules/consultation-tag.rule";

const VALIDATION_MESSAGES = {
	POSITIVE_INTEGER: "正の整数を指定してください",
	BOOLEAN_STRING: '"true" または "false" を指定してください',
} as const;

/**
 * 共通バリデーションスキーマ
 */

/**
 * 正の整数文字列スキーマ
 * 文字列 "123" -> 数値 123 に変換し、1以上を保証
 */ 
const positiveIntegerStringSchema = z.coerce
	.number({ error: VALIDATION_MESSAGES.POSITIVE_INTEGER })
	.int({ error: VALIDATION_MESSAGES.POSITIVE_INTEGER })
	.positive({ error: VALIDATION_MESSAGES.POSITIVE_INTEGER });

/**
 * boolean文字列スキーマ
 * 文字列 "true"/"false" -> boolean true/false に変換
 */
const booleanStringSchema = z
	.enum(["true", "false"], { error: VALIDATION_MESSAGES.BOOLEAN_STRING })
	.transform((val) => val === "true");

const consultationTitleSchema = z
	.string()
	.min(1, "タイトルを入力してください")
	.max(100, "タイトルは100文字以内で入力してください");

const postBodySchema = z
	.string()
	.min(10, "本文は10文字以上入力してください")
	.max(10000, "本文は10,000文字以内で入力してください");

const consultationDraftSchema = z.boolean().optional().default(false);
const consultationTagIdsSchema = z
	.array(z.coerce.number().int().positive("タグIDは正の整数を指定してください"))
	.optional();

/**
 * 相談一覧取得のクエリパラメータバリデーションスキーマ
 */
export const listConsultationsQuerySchema = z.object({
	/**
	 * ユーザーIDでフィルタリング（オプショナル）
	 * - 正の整数のみ許可
	 */
	userId: positiveIntegerStringSchema.optional(),

	/**
	 * 下書き状態でフィルタリング（オプショナル）
	 * - "true" または "false" の文字列をbooleanに変換
	 */
	draft: booleanStringSchema.optional(),

	/**
	 * 解決状態でフィルタリング（オプショナル）
	 * - "true" または "false" の文字列をbooleanに変換
	 */
	solved: booleanStringSchema.optional(),

	/**
	 * ページ番号（オプショナル、デフォルト: 1）
	 * - 1以上の整数のみ許可
	 */
	page: z.coerce
		.number()
		.int("ページ番号は整数を指定してください")
		.min(1, "ページ番号は1以上を指定してください")
		.max(1000, "ページ番号は1000以下を指定してください")
		.optional()
		.default(PAGINATION_CONFIG.DEFAULT_PAGE),

	/**
	 * 1ページあたりの件数（オプショナル、デフォルト: 20）
	 * - 1以上100以下の整数のみ許可
	 */
	limit: z.coerce
		.number()
		.int("件数は整数を指定してください")
		.min(1, "件数は1以上を指定してください")
		.max(PAGINATION_CONFIG.MAX_LIMIT, `件数は${PAGINATION_CONFIG.MAX_LIMIT}以下を指定してください`)
		.optional()
		.default(PAGINATION_CONFIG.DEFAULT_LIMIT),
});

/**
 * 回答一覧取得のクエリパラメータバリデーションスキーマ
 */
export const listAdvicesQuerySchema = z.object({
	/**
	 * ページ番号（オプショナル、デフォルト: 1）
	 * - 1以上の整数のみ許可
	 */
	page: z.coerce
		.number()
		.int("ページ番号は整数を指定してください")
		.min(1, "ページ番号は1以上を指定してください")
		.max(1000, "ページ番号は1000以下を指定してください")
		.optional()
		.default(PAGINATION_CONFIG.DEFAULT_PAGE),

	/**
	 * 1ページあたりの件数（オプショナル、デフォルト: 20）
	 * - 1以上100以下の整数のみ許可
	 */
	limit: z.coerce
		.number()
		.int("件数は整数を指定してください")
		.min(1, "件数は1以上を指定してください")
		.max(PAGINATION_CONFIG.MAX_LIMIT, `件数は${PAGINATION_CONFIG.MAX_LIMIT}以下を指定してください`)
		.optional()
		.default(PAGINATION_CONFIG.DEFAULT_LIMIT),
});

const createConsultationBaseSchema = z.object({
	title: consultationTitleSchema,
	body: postBodySchema,
	draft: consultationDraftSchema,
	tagIds: consultationTagIdsSchema,
});

export const createConsultationSchema = createConsultationBaseSchema.superRefine((data, ctx) => {
	const ruleError = getConsultationTagRuleError(data.draft, data.tagIds);
	if (ruleError) {
		ctx.addIssue({
			code: "custom",
			path: ["tagIds"],
			message: CONSULTATION_TAG_RULE_MESSAGES[ruleError],
		});
	}
});

const updateConsultationBaseSchema = z.object({
	title: consultationTitleSchema,
	body: postBodySchema,
	draft: consultationDraftSchema,
	tagIds: consultationTagIdsSchema,
});

export const updateConsultationSchema = updateConsultationBaseSchema.superRefine((data, ctx) => {
	const ruleError = getConsultationTagRuleError(data.draft, data.tagIds);
	if (ruleError) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["tagIds"],
			message: CONSULTATION_TAG_RULE_MESSAGES[ruleError],
		});
	}
});

export const consultationContentSchema = createConsultationSchema;

export const adviceContentSchema = z.object({
	body: postBodySchema,
	draft: consultationDraftSchema
});

export const updateDraftAdviceContentSchema = z.object({
	body: postBodySchema,
});

export const consultationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;
export type ListAdvicesQuery = z.infer<typeof listAdvicesQuerySchema>;
export type CreateConsultationContent = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationContent = z.infer<typeof updateConsultationSchema>;
export type ConsultationContent = CreateConsultationContent;
export type AdviceContent = z.infer<typeof adviceContentSchema>;
export type UpdateDraftAdviceContentSchema = z.infer<typeof updateDraftAdviceContentSchema>;
export type ConsultationIdParam = z.infer<typeof consultationIdParamSchema>;
