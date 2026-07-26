import type { Context, Next } from "hono";
import type { AppBindings } from "@/index";
import { parseAllowedOrigins } from "@/lib/origin";

/**
 * CSRF 対策の Origin 検証。Origin が許可リスト(FRONTEND_URL)に一致する時だけ通す。
 *
 * 本番は cookie が SameSite=none で送られ SameSite に頼れないため、状態変更 API では
 * サーバ側で Origin を検証する。欠如も拒否する（Origin を送らなければ回避、を塞ぐ）。ADR 013 §5.6。
 */
export const originCheck = async (c: Context<AppBindings>, next: Next) => {
	const origin = c.req.header("Origin");
	const allowedOrigins = parseAllowedOrigins(c.env.FRONTEND_URL);

	if (!origin || !allowedOrigins.includes(origin)) {
		// 値そのもの（攻撃者が任意に付けられる）は残さず、有無と経路のみ記録する。
		console.warn("originCheck: blocked request", {
			method: c.req.method,
			path: c.req.path,
			hasOrigin: Boolean(origin),
		});
		return c.json(
			{ error: "Forbidden", message: "リクエスト元が許可されていません" },
			403,
		);
	}

	await next();
};
