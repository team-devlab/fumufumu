// Presentation層: 相談横断のアドバイス一覧ルート
//
// 【設計メモ】プロフィール画面の「自分のアドバイス一覧」(userIdフィルタ)と、
// admin モデレーションの「公開中/非表示中」タブ(includeHidden/hiddenOnly)の両方から
// 利用する共通 endpoint として設計している (docs/design/adr/011-content-moderation.md §5 関連)。
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectConsultationService } from "@/middlewares/injectService.middleware";
import type { AdviceFilters } from "@/types/advice.types";
import type { PaginationParams } from "@/types/consultation.types";
import { listAdvicesQuerySchema } from "@/validators/consultation.validator";
import { resolveModerationVisibilityFlags } from "@/routes/consultations.controller";

const factory = createFactory<AppBindings>();

export const listAllAdvicesHandlers = factory.createHandlers(
	zValidator("query", listAdvicesQuerySchema, (result) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const validatedQuery = c.req.valid("query");
		const appUserId = c.get("appUserId");
		const db = c.get("db");
		const service = c.get("consultationService");

		const { includeHidden, hiddenOnly } = await resolveModerationVisibilityFlags(
			db,
			appUserId,
			validatedQuery.includeHidden,
			validatedQuery.hiddenOnly,
		);

		const filters: AdviceFilters = {
			userId: validatedQuery.userId,
			includeHidden,
			hiddenOnly,
		};

		const pagination: PaginationParams = {
			page: validatedQuery.page,
			limit: validatedQuery.limit,
		};

		const result = await service.listAllAdvices(filters, pagination);

		// NOTE: キャッシュ制御 (D1課金対策 & セキュリティ)
		// includeHidden/hiddenOnly(admin限定)、userIdフィルタ(個人に紐づく一覧)は
		// 共有キャッシュに乗せると非表示投稿や個人の一覧が他ユーザーに漏れるため禁止する。
		if (!filters.includeHidden && !filters.hiddenOnly && filters.userId === undefined) {
			c.header("Cache-Control", "public, max-age=60");
		} else {
			c.header("Cache-Control", "no-store, max-age=0");
		}

		return c.json(result, 200);
	},
);

export const advicesRoute = new Hono<AppBindings>();

advicesRoute.use("/*", authGuard, injectConsultationService);
advicesRoute.get("/", ...listAllAdvicesHandlers);
