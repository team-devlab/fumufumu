// Presentation層: 相談関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectConsultationService } from "@/middlewares/injectService.middleware";
import type { ConsultationFilters } from "@/types/consultation.types";
import { listConsultationsQuerySchema, createConsultationSchema } from "@/validators/consultation.validator";
import { AppError } from "@/errors/AppError";

// ============================================
// 型定義
// ============================================

// zValidatorを通過した後のContext型
// in: 入力型（HTTPリクエストの生の文字列）, out: 変換後の型（zodで変換された型）
type ListConsultationsContext = Context<
	AppBindings,
	string,
	{ in: { query: unknown }; out: { query: z.output<typeof listConsultationsQuerySchema> } }
>;

type CreateConsultationContext = Context<
	AppBindings,
	string,
	{ in: { json: unknown }; out: { json: z.output<typeof createConsultationSchema> } }
>;

// ============================================
// ファクトリ作成
// ============================================

const factory = createFactory<AppBindings>();

// ============================================
// ハンドラー関数
// ============================================

/**
 * 相談一覧取得ハンドラ
 * 
 * @param c - Honoコンテキスト（バリデーション済みクエリパラメータを含む）
 * @returns 相談一覧のJSONレスポンス
 */
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

		// DIされたサービスを取得
		const service = c.get("consultationService");
		const result = await service.listConsultations(filters);

		return c.json(result, 200);
	} catch (error) {
		console.error('[listConsultations] Failed to fetch consultations:', error);
		
		// AppErrorの場合は適切なステータスコードを返す
		if (error instanceof AppError) {
			return c.json(
				{
					error: error.name,
					message: error.message,
				},
				error.statusCode as any
			);
		}

		// 予期しないエラー
		return c.json(
			{
				error: 'Internal server error',
				message: 'Failed to fetch consultations',
			},
			500
		);
	}
}

/**
 * 相談作成ハンドラ
 * 
 * @param c - Honoコンテキスト（バリデーション済みリクエストボディを含む）
 * @returns 作成された相談のJSONレスポンス
 */
export async function createConsultation(c: CreateConsultationContext) {
	try {
		const validatedBody = c.req.valid("json");
		const authorId = c.get("appUserId");

		// DIされたサービスを取得
		const service = c.get("consultationService");
		const result = await service.createConsultation(validatedBody, authorId);

		return c.json(result, 201);
	} catch (error) {
		console.error('[createConsultation] 相談の作成に失敗しました:', error);
		
		// AppErrorの場合は適切なステータスコードを返す
		if (error instanceof AppError) {
			return c.json(
				{
					error: error.name,
					message: error.message,
				},
				error.statusCode as any
			);
		}

		// 予期しないエラー
		return c.json(
			{
				error: 'Internal server error',
				message: '相談の作成に失敗しました',
			},
			500
		);
	}
}

// ============================================
// ハンドラー（createHandlers版）
// ============================================

export const listConsultationsHandlers = factory.createHandlers(
	zValidator("query", listConsultationsQuerySchema),
	async (c) => listConsultations(c)
);

export const createConsultationHandlers = factory.createHandlers(
	zValidator("json", createConsultationSchema),
	async (c) => createConsultation(c)
);

// ============================================
// ルーター設定
// ============================================

export const consultationsRoute = new Hono<AppBindings>();

// ミドルウェア適用（認証 → サービス注入の順）
consultationsRoute.use("/*", authGuard, injectConsultationService);

// ルーティング登録
consultationsRoute.get("/", ...listConsultationsHandlers);
consultationsRoute.post("/", ...createConsultationHandlers);
