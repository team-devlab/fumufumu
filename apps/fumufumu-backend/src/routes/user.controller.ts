// Presentation層: ユーザー関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { eq } from "drizzle-orm";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { users } from "@/db/schema/user";
import { AppError } from "@/errors/AppError";

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
	try {
		const appUserId = c.get("appUserId");
		console.log("appUserId", appUserId);
		const db = c.get("db");

		// ユーザー情報を取得
		const user = await db.query.users.findFirst({
			where: eq(users.id, appUserId),
			columns: {
				id: true,
				name: true,
				disabled: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new AppError("User not found"+"appUserId: "+appUserId, 404);
		}

		return c.json(user, 200);
	} catch (error) {
		console.error("[getCurrentUser] Failed to fetch user:", error);

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
				error: "Internal server error",
				message: "Failed to fetch user",
			},
			500
		);
	}
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

// ミドルウェア適用（認証）
userRoute.use("/*", authGuard);

// ルーティング登録
userRoute.get("/me", ...getCurrentUserHandlers);
