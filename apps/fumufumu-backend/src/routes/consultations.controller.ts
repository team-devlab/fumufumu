// Presentation層: 相談関連ルート
import { Hono } from "hono";
import type { Context } from "hono";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";
import { authGuard } from "@/middlewares/authGuard.middleware";
import type { ConsultationFilters } from "@/types/consultation.types";

export const consultationsRoute = new Hono();

// 認証ミドルウェアを適用
consultationsRoute.use("/*", authGuard);

export const listConsultations = async (c: Context) => {
	try {
		// クエリパラメータを取得
		const userId = c.req.query("userId");
		const draft = c.req.query("draft");
		const solved = c.req.query("solved");

		// フィルタオブジェクトを構築
		// userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
		// プロフィール画面などで自身の相談のみを取得する場合は、明示的にuserIdを指定する
		const filters: ConsultationFilters = {
			userId: userId ? Number(userId) : undefined,
			draft: draft !== undefined ? draft === "true" : undefined,
			solved: solved !== undefined ? solved === "true" : undefined,
		};

		const db = c.get("db");
		const repository = new ConsultationRepository(db);
		const service = new ConsultationService(repository);
		const result = await service.listConsultaitons(filters);
		
		return c.json(result, 200);
	} catch (error) {
		console.error('[listConsultations] Failed to fetch consultations:', error);
		return c.json(
			{
				error: 'Internal server error',
				message: 'Failed to fetch consultations',
			},
			500
		);
	}
};

// ルーティング登録
consultationsRoute.get("/", listConsultations);


