import { Hono, type Context } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppBindings } from "@/index";
import { createNotificationService } from "@/services/service.factory";
import { resendNotificationSchema } from "@/validators/notification.validator";

const factory = createFactory<AppBindings>();
const DEFAULT_RESEND_TIMEOUT_MS = 8000;

/**
 * "Bearer <token>" の形式からトークン文字列を取り出す。
 */
function extractBearerToken(authorizationHeader?: string): string | null {
	if (!authorizationHeader) {
		return null;
	}

	const [scheme, token] = authorizationHeader.split(" ");
	if (scheme !== "Bearer" || !token?.trim()) {
		return null;
	}

	return token.trim();
}

const requireInternalToken = factory.createMiddleware(async (c: Context<AppBindings>, next) => {
	const expected = c.env.NOTIFICATION_INTERNAL_TOKEN?.trim();
	if (!expected) {
		return c.json(
			{
				error: "InternalServerError",
				message: "NOTIFICATION_INTERNAL_TOKEN が未設定です",
			},
			500,
		);
	}

	const received = extractBearerToken(c.req.header("Authorization"));
	if (!received || received !== expected) {
		return c.json(
			{
				error: "Unauthorized",
				message: "認証に失敗しました",
			},
			401,
		);
	}

	await next();
});

/**
 * 送信タイムアウト値を環境変数から取得する。
 */
function readTimeoutMs(env: AppBindings["Bindings"]): number | null {
	const raw = env.RESEND_TIMEOUT_MS?.trim();
	if (!raw) {
		return DEFAULT_RESEND_TIMEOUT_MS;
	}

	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}
	return parsed;
}

const resendNotificationHandlers = factory.createHandlers(
	requireInternalToken,
	zValidator("json", resendNotificationSchema, (result) => {
		if (!result.success) {
			throw result.error;
		}
	}),
	async (c) => {
		const body = c.req.valid("json");
		const db = c.get("db");
		const resendApiKey = c.env.RESEND_API_KEY?.trim();
		if (!resendApiKey) {
			return c.json(
				{
					error: "InternalServerError",
					message: "RESEND_API_KEY が未設定です",
				},
				500,
			);
		}

		const resendFrom = c.env.RESEND_FROM_EMAIL?.trim();
		if (!resendFrom) {
			return c.json(
				{
					error: "InternalServerError",
					message: "RESEND_FROM_EMAIL が未設定です",
				},
				500,
			);
		}

		const timeoutMs = readTimeoutMs(c.env);
		if (timeoutMs === null) {
			return c.json(
				{
					error: "InternalServerError",
					message: "RESEND_TIMEOUT_MS は 1 以上の整数を指定してください",
				},
				500,
			);
		}

		const service = createNotificationService(db, {
			resendApiKey,
			resendFrom,
			appBaseUrl: c.env.APP_BASE_URL?.trim() || undefined,
			resendEndpoint: c.env.RESEND_ENDPOINT?.trim() || undefined,
			timeoutMs,
		});

		const result = await service.resend(body.targetType, body.targetId);
		return c.json(result, 200);
	},
);

export const internalNotificationsRoute = new Hono<AppBindings>();

internalNotificationsRoute.post("/resend", ...resendNotificationHandlers);
