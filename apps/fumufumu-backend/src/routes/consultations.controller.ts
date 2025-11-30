// Presentation層: 相談関連ルート
import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env, Variables } from "@/index";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";
import { authGuard } from "@/middlewares/authGuard.middleware";
import type { ConsultationFilters } from "@/types/consultation.types";
import { listConsultationsQuerySchema, type ListConsultationsQuery } from "@/validators/consultation.validator";

export const consultationsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// 認証ミドルウェアを適用
consultationsRoute.use("/*", authGuard);

export const listConsultations = async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
	try {
		// バリデーション済みのクエリパラメータを取得
		const validatedQuery = (c.req as any).valid("query") as ListConsultationsQuery;

		// フィルタオブジェクトを構築
		// userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
		// プロフィール画面などで自身の相談のみを取得する場合は、明示的にuserIdを指定する
		const filters: ConsultationFilters = {
			userId: validatedQuery.userId,
			draft: validatedQuery.draft,
			solved: validatedQuery.solved,
		};

		const db = c.get("db");
		const repository = new ConsultationRepository(db);
		const service = new ConsultationService(repository);
		const result = await service.listConsultations(filters);
		
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
consultationsRoute.get(
	"/",
	zValidator("query", listConsultationsQuerySchema),
	listConsultations
);


