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
import {
	listAdvicesQuerySchema,
	adviceIdParamSchema,
	updateDraftAdviceContentSchema,
} from "@/validators/consultation.validator";
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
			draft: validatedQuery.draft,
			includeHidden,
			hiddenOnly,
		};

		const pagination: PaginationParams = {
			page: validatedQuery.page,
			limit: validatedQuery.limit,
		};

		// 下書きは本人限定の非公開データのため、認証ユーザー(appUserId)を渡して
		// Service層で userId を本人へ強制させる（他人の下書きを取得不可にする）
		const result = await service.listAllAdvices(filters, pagination, appUserId);

		// NOTE: キャッシュ制御 (D1課金対策 & セキュリティ)
		// includeHidden/hiddenOnly(admin限定)、draft(本人限定の非公開データ)、
		// own-view(?userId=自分)は共有キャッシュに乗せると非表示投稿や本人の未承認投稿が
		// 他ユーザーに漏れるため禁止する。
		// own-view のみ未承認(pending/rejected)を含む(listAllAdvices が includeUnapprovedForOwn を
		// 自分のuserId指定時だけ立てる, #179)。他人のuserId指定は承認済みのみ返るため公開キャッシュ可とし、
		// 一律no-storeを解いた(consultations.controller.ts #163対応と対称)。
		const isOwnView = validatedQuery.userId !== undefined && validatedQuery.userId === appUserId;
		if (!filters.includeHidden && !filters.hiddenOnly && !filters.draft && !isOwnView) {
			c.header("Cache-Control", "public, max-age=60");
		} else {
			c.header("Cache-Control", "no-store, max-age=0");
		}

		return c.json(result, 200);
	},
);

// アドバイス下書きの更新(本文のみ・draft維持)。adviceId で更新対象を一意に特定する(経緯は ADR 012)。
export const updateDraftAdviceHandlers = factory.createHandlers(
	zValidator("param", adviceIdParamSchema, (result) => {
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
	},
);

// アドバイス下書きの公開(draft:false化 + 審査待ち content_check 作成 + 親相談 updatedAt 更新)。
// adviceId で公開対象を一意に特定する(経緯は ADR 012)。本文は確認画面から受け取り、entry の
// 未保存編集も公開へ反映する。認可・可視性は Service/Repository 層で強制(本人の可視親の下書き以外は404)。
export const publishDraftAdviceHandlers = factory.createHandlers(
	zValidator("param", adviceIdParamSchema, (result) => {
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
		const result = await service.publishDraftAdvice(id, validatedBody, authorId);
		return c.json(result, 200);
	},
);

export const advicesRoute = new Hono<AppBindings>();

advicesRoute.use("/*", authGuard, injectConsultationService);
advicesRoute.get("/", ...listAllAdvicesHandlers);
advicesRoute.put("/:id/draft", ...updateDraftAdviceHandlers);
advicesRoute.put("/:id/publish", ...publishDraftAdviceHandlers);
