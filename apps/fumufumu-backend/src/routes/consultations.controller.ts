// Presentation層: 相談関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectConsultationService } from "@/middlewares/injectService.middleware";
import type { ConsultationFilters, PaginationParams } from "@/types/consultation.types";
import { listConsultationsQuerySchema, consultationContentSchema, adviceContentSchema, updateDraftAdviceContentSchema, consultationIdParamSchema } from "@/validators/consultation.validator";

// ============================================
// ファクトリ作成
// ============================================

const factory = createFactory<AppBindings>();

// ============================================
// ハンドラー（createHandlers版）
// ============================================

export const getConsultationHandlers = factory.createHandlers(
	zValidator("param", consultationIdParamSchema, (result, c) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const service = c.get("consultationService");
		const appUserId = c.get("appUserId");

		const result = await service.getConsultation(id, appUserId);
		return c.json(result, 200);
	}
);

export const listConsultationsHandlers = factory.createHandlers(
  zValidator("query", listConsultationsQuerySchema, (result) => {
    if (!result.success) {
      throw result.error;
    }
  }),
  async (c) => {
    // バリデーション済みのクエリパラメータを取得
    const validatedQuery = c.req.valid("query");

    const filters: ConsultationFilters = {
      userId: validatedQuery.userId,
      draft: validatedQuery.draft,
      solved: validatedQuery.solved,
    };

    const pagination: PaginationParams = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
    };

    const appUserId = c.get("appUserId");
    const service = c.get("consultationService");

    // サービス実行（エラーが発生した場合は global error handler へ飛ぶ）
    const result = await service.listConsultations(filters, pagination, appUserId);
    
    // NOTE: キャッシュ制御 (D1課金対策 & セキュリティ)
    // 下書き(draft=true)は「個人情報」に近いのでキャッシュしてはいけない。
	// 公開データの場合のみ、60秒間のキャッシュを許可。
	if (!filters.draft) {
		c.header('Cache-Control', 'public, max-age=60');
	} else {
		// 下書きの場合はキャッシュしない（明示的に指定）
		c.header('Cache-Control', 'no-store, max-age=0');
	}

    return c.json(result, 200);
  }
);

export const createConsultationHandlers = factory.createHandlers(
	// 第3引数にフックを追加して、明示的にエラーをthrowさせる必要があります
	zValidator("json", consultationContentSchema, (result, c) => {
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
	zValidator("json", consultationContentSchema, (result) => {
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

export const createAdviceHandlers = factory.createHandlers(
	zValidator("param", consultationIdParamSchema, (result) => {
		if (!result.success) throw result.error;
	}),
	zValidator("json", adviceContentSchema, (result) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const validatedBody = c.req.valid("json");
		const authorId = c.get("appUserId");
		const service = c.get("consultationService");
		const result = await service.createAdvice(id, validatedBody, authorId);
		return c.json(result, 201);
	}
);

export const updateDraftAdviceHandlers = factory.createHandlers(
	zValidator("param", consultationIdParamSchema, (result) => {
		if (!result.success) throw result.error;
	}),
	zValidator("json", updateDraftAdviceContentSchema, (result) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const validatedBody = c.req.valid("json");
		const authorId = c.get("appUserId");
		const service = c.get("consultationService");
		const result = await service.updateDraftAdvice(id, validatedBody, authorId);
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
// 相談関連
consultationsRoute.get("/:id", ...getConsultationHandlers);
consultationsRoute.get("/", ...listConsultationsHandlers);
consultationsRoute.post("/", ...createConsultationHandlers);
consultationsRoute.put("/:id", ...updateConsultationHandlers);
// 相談に対するアドバイス関連
consultationsRoute.post("/:id/advice", ...createAdviceHandlers);
consultationsRoute.put("/:id/advice/draft", ...updateDraftAdviceHandlers);
