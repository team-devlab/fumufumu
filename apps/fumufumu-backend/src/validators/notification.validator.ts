import { z } from "zod";

/**
 * 内部通知API: 再送対象を1件指定するための入力。
 */
export const resendNotificationSchema = z.object({
	targetType: z.enum(["consultation", "advice"]),
	targetId: z.number().int().positive(),
});

