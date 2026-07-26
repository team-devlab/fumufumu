// Presentation層: ユーザー関連ルート
import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppBindings } from "@/index";
import { authGuard, withdrawalAuthGuard } from "@/middlewares/authGuard.middleware";
import { injectUserService } from "@/middlewares/injectService.middleware";
import { originCheck } from "@/middlewares/originCheck.middleware";
import { withdrawUserSchema } from "@/validators/user.validator";

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

// 退会（アカウント削除・PII 消去）。認証(withdrawalAuthGuard, BAN 中でも通す)と
// CSRF(originCheck) はルート側で担保する。
export const withdrawCurrentUserHandlers = factory.createHandlers(
	zValidator("json", withdrawUserSchema, (result) => {
		if (!result.success) throw result.error;
	}),
	async (c) => {
		const appUserId = c.get("appUserId");
		const role = c.get("userRole");
		const { email } = c.req.valid("json");
		const service = c.get("userService");

		await service.withdraw({ appUserId, role, inputEmail: email });

		// 全セッション行は削除済み。signOut は DB 削除が no-op でも cookie 削除ヘッダを
		// 必ず返すため、これで現在の端末のセッション cookie をクリアする。
		const auth = c.get("auth");
		const signOutResponse = await auth.api.signOut({
			headers: c.req.raw.headers,
			asResponse: true,
		});

		const response = c.json({ message: "退会が完了しました" }, 200);
		const setCookie = signOutResponse.headers.get("Set-Cookie");
		if (setCookie) {
			response.headers.set("Set-Cookie", setCookie);
		}
		return response;
	},
);

// ============================================
// ルーター設定
// ============================================

export const userRoute = new Hono<AppBindings>();

// 退会だけ別ガード（BAN 中でも通す）＋ CSRF が要るため、ミドルウェアはルート毎に付ける。
// GET /me は従来どおり authGuard（disabled は 403）。
userRoute.get("/me", authGuard, injectUserService, ...getCurrentUserHandlers);
userRoute.delete(
	"/me",
	originCheck,
	withdrawalAuthGuard,
	injectUserService,
	...withdrawCurrentUserHandlers,
);
