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
import { listConsultationsQuerySchema, createConsultationSchema } from "@/validators/consultation.validator";

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

// ============================================================
// 相談作成エンドポイント (POST /api/consultations)
// ============================================================

/**
 * 相談作成ハンドラのContext型定義
 * - in: 入力型（HTTPリクエストのJSON）
 * - out: 変換後の型（zodで検証・変換された型）
 */
type CreateConsultationContext = Context<
	{ Bindings: Env; Variables: Variables },
	string,
	{ in: { json: unknown }; out: { json: z.output<typeof createConsultationSchema> } }
>;

/**
 * 相談作成ハンドラ関数
 */
export async function createConsultation(c: CreateConsultationContext) {
	try {
		const validatedBody = c.req.valid("json");
		const authorId = c.get("appUserId");

		const db = c.get("db");
		const repository = new ConsultationRepository(db);
		const service = new ConsultationService(repository);
		const result = await service.createConsultation(validatedBody, authorId);

		return c.json(result, 201);
	} catch (error) {
		console.error('[createConsultation] 相談の作成に失敗しました:', error);
		return c.json(
			{
				error: 'Internal server error',
				message: '相談の作成に失敗しました',
			},
			500
		);
	}
}

/**
 * 相談作成ハンドラ（createHandlers版）
 */
export const createConsultationHandlers = factory.createHandlers(
	zValidator("json", createConsultationSchema),
	async (c) => {
		return createConsultation(c);
	}
);

// POSTルーティング登録
consultationsRoute.post("/", ...createConsultationHandlers);