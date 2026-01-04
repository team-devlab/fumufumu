// サービス注入ミドルウェア: Contextにサービスインスタンスを注入する
import type { Context, Next } from "hono";
import type { AppBindings } from "@/index";
import { createConsultationService } from "@/services/service.factory";

/**
 * ConsultationServiceを注入するミドルウェア
 * DBインスタンスからConsultationServiceを生成してContextに格納する
 * 
 * 使い方:
 * ```typescript
 * app.use("/api/consultations/*", injectConsultationService);
 * app.get("/api/consultations", (c) => {
 *   const service = c.get("consultationService");
 *   // serviceを使用
 * });
 * ```
 */
export async function injectConsultationService(
	c: Context<AppBindings>,
	next: Next
) {
	const db = c.get("db");
	const consultationService = createConsultationService(db);
	c.set("consultationService", consultationService);
	await next();
}

