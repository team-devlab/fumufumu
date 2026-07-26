import { z } from "zod";

// 退会リクエスト(type-to-confirm)。本人メールとの一致は Service で判定するため、ここは非空のみ検証する。
export const withdrawUserSchema = z.object({
	email: z.string().min(1, "確認のためメールアドレスを入力してください"),
});

export type WithdrawUserInput = z.infer<typeof withdrawUserSchema>;
