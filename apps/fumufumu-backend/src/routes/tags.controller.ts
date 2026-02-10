// Presentation層: タグ関連ルート
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectTagService } from "@/middlewares/injectService.middleware";

const factory = createFactory<AppBindings>();

// ============================================
// ハンドラ定義
// ============================================

/**
 * GET /api/tags — タグ一覧取得
 * sort_order ASC, id ASC の順で全タグを返却する（件数付き）
 */
export const listTagsHandlers = factory.createHandlers(
	async (c) => {
		const service = c.get("tagService");
		const result = await service.listTags();
		c.header('Cache-Control', 'max-age=3600'); // 1時間キャッシュ
		return c.json(result, 200);
	}
);

// ============================================
// ルーター設定
// ============================================

export const tagsRoute = new Hono<AppBindings>();

// ミドルウェア適用（認証 → サービス注入の順）
tagsRoute.use("/*", authGuard, injectTagService);

// ルーティング登録
tagsRoute.get("/", ...listTagsHandlers);
