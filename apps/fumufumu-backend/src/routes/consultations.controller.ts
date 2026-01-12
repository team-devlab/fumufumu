// Presentation層: 相談関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectConsultationService } from "@/middlewares/injectService.middleware";
import type { ConsultationFilters } from "@/types/consultation.types";
import { listConsultationsQuerySchema, consultationLoadSchema } from "@/validators/consultation.validator";
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

const consultationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});


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

// ============================================
// ハンドラー（createHandlers版）
// ============================================

export const listConsultationsHandlers = factory.createHandlers(
	zValidator("query", listConsultationsQuerySchema),
	async (c) => listConsultations(c)
);

export const createConsultationHandlers = factory.createHandlers(
  // 第3引数にフックを追加して、明示的にエラーをthrowさせる必要があります
  zValidator("json", consultationLoadSchema, (result, c) => {
    if (!result.success) {
      // ここで throw することで、app.onError が呼ばれるようになります
      throw result.error;
    }
  }),
  async (c) => {
    // 1. バリデーション済みのデータを取得
    const validatedBody = c.req.valid("json");
    
    // 2. コンテキストから依存を取得
    const authorId = c.get("appUserId");
    const service = c.get("consultationService");

    // 3. サービス実行
    const result = await service.createConsultation(validatedBody, authorId);
    return c.json(result, 201);
  }
);

export const updateConsultationHandlers = factory.createHandlers(
  zValidator("param", consultationIdParamSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  zValidator("json", consultationLoadSchema, (result) => {
    if (!result.success) throw result.error;
  }),
	async (c) => {
		const { id } = c.req.valid("param");
		const validatedBody = c.req.valid("json");
		const authorId = c.get("appUserId");
		const service = c.get("consultationService");

		const result = await service.updateConsultation(id, validatedBody, authorId);
		return c.json(result, 200);
	}
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
consultationsRoute.put("/:id", ...updateConsultationHandlers);