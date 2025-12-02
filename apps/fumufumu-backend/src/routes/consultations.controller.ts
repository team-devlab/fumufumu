// Presentation層: 相談関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import type { Env, Variables } from "@/index";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";
import { authGuard } from "@/middlewares/authGuard.middleware";
import type { ConsultationFilters } from "@/types/consultation.types";
import { listConsultationsQuerySchema } from "@/validators/consultation.validator";

// ファクトリを作成（型安全なハンドラ生成用）
const factory = createFactory<{ Bindings: Env; Variables: Variables }>();

// zValidatorを通過した後のContext型
// in: 入力型（HTTPリクエストの生の文字列）, out: 変換後の型（zodで変換された型）
type ListConsultationsContext = Context<
	{ Bindings: Env; Variables: Variables },
	string,
	{ in: { query: unknown }; out: { query: z.output<typeof listConsultationsQuerySchema> } }
>;

// 相談一覧取得ハンドラ関数（テスト用にエクスポート）
export async function listConsultations(c: ListConsultationsContext) {
	try {
		// バリデーション済みのクエリパラメータを取得
		const validatedQuery = c.req.valid("query");

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
}

// 相談一覧取得ハンドラ（createHandlers版）
export const listConsultationsHandlers = factory.createHandlers(
	zValidator("query", listConsultationsQuerySchema),
	async (c) => {
		return listConsultations(c);
	}
);

// ルーター作成
export const consultationsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// 認証ミドルウェアを適用
consultationsRoute.use("/*", authGuard);

// ルーティング登録
consultationsRoute.get("/", ...listConsultationsHandlers);


