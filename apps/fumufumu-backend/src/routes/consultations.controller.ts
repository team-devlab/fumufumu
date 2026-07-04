// Presentation層: 相談関連ルート
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { AppBindings, DbInstance } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectConsultationService } from "@/middlewares/injectService.middleware";
import { users } from "@/db/schema/user";
import type { ConsultationFilters, PaginationParams } from "@/types/consultation.types";
import type { AdviceFilters } from "@/types/advice.types";
import {
	listConsultationsQuerySchema,
	getConsultationQuerySchema,
	listAdvicesQuerySchema,
	createConsultationSchema,
	updateConsultationSchema,
	adviceContentSchema,
	updateDraftAdviceContentSchema,
	consultationIdParamSchema,
} from "@/validators/consultation.validator";

// ============================================
// ファクトリ作成
// ============================================

const factory = createFactory<AppBindings>();

/**
 * includeHiddenクエリはadmin権限時のみ有効にする（ADR 011 §3.3, §3.4）
 * 未指定時はDB問い合わせを行わない
 */
async function resolveIncludeHidden(
	db: DbInstance,
	appUserId: number,
	requestedIncludeHidden: boolean | undefined,
): Promise<boolean> {
	if (!requestedIncludeHidden) {
		return false;
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, appUserId),
		columns: { role: true },
	});

	return user?.role === "admin";
}

// ============================================
// ハンドラー（createHandlers版）
// ============================================

export const getConsultationHandlers = factory.createHandlers(
	zValidator("param", consultationIdParamSchema, (result, c) => {
		if (!result.success) throw result.error;
	}),
	zValidator("query", getConsultationQuerySchema, (result) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const validatedQuery = c.req.valid("query");
		const service = c.get("consultationService");
		const appUserId = c.get("appUserId");
		const pagination: PaginationParams = {
			page: validatedQuery.page,
			limit: validatedQuery.limit,
		};

		const result = await service.getConsultation(id, appUserId, pagination);
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

		const appUserId = c.get("appUserId");
		const db = c.get("db");
		const service = c.get("consultationService");

		const includeHidden = await resolveIncludeHidden(db, appUserId, validatedQuery.includeHidden);

		const filters: ConsultationFilters = {
			userId: validatedQuery.userId,
			draft: validatedQuery.draft,
			solved: validatedQuery.solved,
			includeHidden,
		};

		const pagination: PaginationParams = {
			page: validatedQuery.page,
			limit: validatedQuery.limit,
		};

		// サービス実行（エラーが発生した場合は global error handler へ飛ぶ）
		const result = await service.listConsultations(filters, pagination, appUserId);

		// NOTE: キャッシュ制御 (D1課金対策 & セキュリティ)
		// 下書き(draft=true)は「個人情報」に近いのでキャッシュしてはいけない。
		// includeHidden(admin限定)のレスポンスも共有キャッシュに乗せると非表示投稿が他ユーザーに漏れるため同様に禁止する。
		// 公開データの場合のみ、60秒間のキャッシュを許可。
		if (!filters.draft && !filters.includeHidden) {
			c.header('Cache-Control', 'public, max-age=60');
		} else {
			// 下書き・includeHiddenの場合はキャッシュしない（明示的に指定）
			c.header('Cache-Control', 'no-store, max-age=0');
		}

		return c.json(result, 200);
	}
);

export const createConsultationHandlers = factory.createHandlers(
  // 第3引数にフックを追加して、明示的にエラーをthrowさせる必要があります
  zValidator("json", createConsultationSchema, (result, c) => {
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
  zValidator("json", updateConsultationSchema, (result) => {
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

export const listAdvicesHandlers = factory.createHandlers(
	zValidator("param", consultationIdParamSchema, (result) => {
		if (!result.success) throw result.error;
	}),
	zValidator("query", listAdvicesQuerySchema, (result) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const validatedQuery = c.req.valid("query");
		const appUserId = c.get("appUserId");
		const db = c.get("db");
		const service = c.get("consultationService");

		const includeHidden = await resolveIncludeHidden(db, appUserId, validatedQuery.includeHidden);

		const pagination: PaginationParams = {
			page: validatedQuery.page,
			limit: validatedQuery.limit,
		};

		const filters: AdviceFilters = {
			userId: validatedQuery.userId,
			includeHidden,
		};

		const result = await service.listAdvices(id, pagination, appUserId, filters);
		// NOTE: 回答一覧はユーザーごとに可視性が変わるため、キャッシュを明示的に禁止する
		c.header('Cache-Control', 'no-store, max-age=0');
		return c.json(result, 200);
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
consultationsRoute.get("/", ...listConsultationsHandlers);
consultationsRoute.get("/:id", ...getConsultationHandlers);
consultationsRoute.post("/", ...createConsultationHandlers);
consultationsRoute.put("/:id", ...updateConsultationHandlers);
consultationsRoute.post("/:id/advice", ...createAdviceHandlers);
consultationsRoute.get("/:id/advices", ...listAdvicesHandlers);
consultationsRoute.put("/:id/advice/draft", ...updateDraftAdviceHandlers);
