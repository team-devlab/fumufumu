// Presentation層: ユーザー関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectUserService } from "@/middlewares/injectService.middleware";

// ============================================
// ファクトリ作成
// ============================================

const factory = createFactory<AppBindings>();

// ============================================
// ハンドラー関数
// ============================================

/**
 * 現在のユーザー情報取得ハンドラ
 * 
 * @param c - Honoコンテキスト
 * @returns ユーザー情報のJSONレスポンス
 */
export async function getCurrentUser(c: Context<AppBindings>) {
	// 認証済みユーザーIDを取得
	const appUserId = c.get("appUserId");

	// DIされたサービスを取得
	const service = c.get("userService");

	// サービス実行
	const user = await service.getCurrentUser(appUserId);

	return c.json(user, 200);
}

// ============================================
// ハンドラー（createHandlers版）
// ============================================

export const getCurrentUserHandlers = factory.createHandlers(
	async (c) => getCurrentUser(c)
);

// ============================================
// ルーター設定
// ============================================

export const userRoute = new Hono<AppBindings>();

// ミドルウェア適用（認証 → サービス注入の順）
userRoute.use("/*", authGuard, injectUserService);

// ルーティング登録
userRoute.get("/me", ...getCurrentUserHandlers);
