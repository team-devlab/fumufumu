// Presentation層: 相談関連ルート
import { Hono } from "hono";
import type { Context } from "hono";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";
import { authGuard } from "@/middlewares/authGuard.middleware";

export const consultationsRoute = new Hono();

// 認証ミドルウェアを適用
consultationsRoute.use("/*", authGuard);

export const listConsultations = async (c: Context) => {
	// authGuardによってappUserIdがContextに設定されている
	const appUserId = c.get("appUserId");

	// クエリパラメータを取得
	const userId = c.req.query("userId");
	const draft = c.req.query("draft");
	const solved = c.req.query("solved");

	// フィルタオブジェクトを構築
	// userIdが指定されていない場合は、ログインユーザーのappUserIdを使用
	const filters = {
		userId: userId ? Number(userId) : appUserId,
		draft: draft !== undefined ? draft === "true" : undefined,
		solved: solved !== undefined ? solved === "true" : undefined,
	};

	const db = c.get("db");
	const repository = new ConsultationRepository(db);
	const service = new ConsultationService(repository);
	const result = await service.listConsultaitons(filters);
	return c.json(result);
};

// ルーティング登録
consultationsRoute.get("/", listConsultations);


