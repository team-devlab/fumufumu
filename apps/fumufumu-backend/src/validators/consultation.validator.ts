import { z } from "zod";

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
	.number({ invalid_type_error: VALIDATION_MESSAGES.POSITIVE_INTEGER })
	.int({ message: VALIDATION_MESSAGES.POSITIVE_INTEGER })
	.positive({ message: VALIDATION_MESSAGES.POSITIVE_INTEGER });

/**
 * boolean文字列スキーマ
 * 文字列 "true"/"false" -> boolean true/false に変換
 */
const booleanStringSchema = z
	.enum(["true", "false"], {
		errorMap: () => ({ message: VALIDATION_MESSAGES.BOOLEAN_STRING }),
	})
	.transform((val) => val === "true");

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
});

export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;

