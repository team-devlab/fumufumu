import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../index";
import { setupIntegrationTest, forceSetDisabled } from "./helpers/db-helper";
import { createAndLoginUser } from "./helpers/auth-helper";
import { createApiRequest } from "./helpers/request-helper";

/**
 * 退会エンドポイント DELETE /api/users/me の API テスト。
 *
 * 認証（BAN 中でも通す）・CSRF(Origin 検証)・type-to-confirm・完全性（全 identity テーブルで
 * 当該ユーザー行が 0）・投稿の匿名化（set null）・セッション失効を HTTP 経由で検証する。
 */

// .dev.vars の FRONTEND_URL と一致させ、正当な Origin として使う。
const ALLOWED_ORIGIN = "http://localhost:3000";

const deleteMe = (options: {
	cookie?: string;
	body?: unknown;
	origin?: string | null;
}) => {
	const req = createApiRequest("/api/users/me", "DELETE", {
		cookie: options.cookie,
		body: options.body,
	});
	if (options.origin) {
		req.headers.set("Origin", options.origin);
	}
	return req;
};

const count = async (sql: string, ...binds: unknown[]): Promise<number> => {
	const row = (await env.DB.prepare(sql)
		.bind(...binds)
		.first()) as { c: number } | null;
	return Number(row?.c ?? 0);
};

describe("DELETE /api/users/me（退会エンドポイント）", () => {
	beforeAll(async () => {
		await setupIntegrationTest();
	});

	it("成功: 認証情報を全削除し、投稿は匿名化して残し、セッションを失効させる", async () => {
		const user = await createAndLoginUser();

		// 本人の相談（下書き）を用意し、退会後に author_id が NULL 化される（set null 匿名化）ことを見る。
		const consultationRes = await app.fetch(
			createApiRequest("/api/consultations", "POST", {
				cookie: user.cookie,
				body: {
					title: "退会テスト相談",
					body: "退会後に匿名化されて残ることを確認する本文です。",
					draft: true,
				},
			}),
			env,
		);
		expect(consultationRes.status).toBe(201);
		const consultation = (await consultationRes.json()) as { id: number };

		const res = await app.fetch(
			deleteMe({
				cookie: user.cookie,
				body: { email: user.email },
				origin: ALLOWED_ORIGIN,
			}),
			env,
		);
		expect(res.status).toBe(200);
		// セッション cookie のクリアヘッダが返る。
		expect(res.headers.get("set-cookie")).toBeTruthy();

		// 完全性: 認証/業務の identity 行がどのテーブルにも残らない。
		expect(await count("SELECT COUNT(*) AS c FROM users WHERE id = ?", user.appUserId)).toBe(0);
		expect(
			await count("SELECT COUNT(*) AS c FROM auth_mappings WHERE app_user_id = ?", user.appUserId),
		).toBe(0);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", user.authUserId)).toBe(0);
		expect(
			await count("SELECT COUNT(*) AS c FROM auth_sessions WHERE user_id = ?", user.authUserId),
		).toBe(0);
		expect(
			await count("SELECT COUNT(*) AS c FROM auth_accounts WHERE user_id = ?", user.authUserId),
		).toBe(0);
		expect(
			await count("SELECT COUNT(*) AS c FROM auth_verifications WHERE identifier = ?", user.email),
		).toBe(0);

		// 匿名化: 相談は残るが author_id は NULL（他者の文脈を壊さず著者だけ伏せる）。
		const consultationRow = (await env.DB.prepare(
			"SELECT author_id FROM consultations WHERE id = ?",
		)
			.bind(consultation.id)
			.first()) as { author_id: number | null } | null;
		expect(consultationRow).not.toBeNull();
		expect(consultationRow?.author_id).toBeNull();

		// セッション失効: 退会後は同じ cookie でも 401。
		const afterRes = await app.fetch(
			createApiRequest("/api/users/me", "GET", { cookie: user.cookie }),
			env,
		);
		expect(afterRes.status).toBe(401);
	});

	it("メール不一致は 400 で退会しない", async () => {
		const user = await createAndLoginUser();

		const res = await app.fetch(
			deleteMe({
				cookie: user.cookie,
				body: { email: `wrong-${user.email}` },
				origin: ALLOWED_ORIGIN,
			}),
			env,
		);
		expect(res.status).toBe(400);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", user.authUserId)).toBe(1);
	});

	it("メール未入力は 400（バリデーション）で退会しない", async () => {
		const user = await createAndLoginUser();

		const res = await app.fetch(
			deleteMe({ cookie: user.cookie, body: {}, origin: ALLOWED_ORIGIN }),
			env,
		);
		expect(res.status).toBe(400);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", user.authUserId)).toBe(1);
	});

	it("BAN(disabled)中でも退会できる（GET /me は 403 なのに退会は通る）", async () => {
		const user = await createAndLoginUser();
		await forceSetDisabled(user.appUserId);

		// 対比: 通常の認証必須 API は disabled だと 403 で弾かれる。
		const guardedRes = await app.fetch(
			createApiRequest("/api/users/me", "GET", { cookie: user.cookie }),
			env,
		);
		expect(guardedRes.status).toBe(403);

		// 退会は BAN 中でも通り、物理削除される。
		const res = await app.fetch(
			deleteMe({
				cookie: user.cookie,
				body: { email: user.email },
				origin: ALLOWED_ORIGIN,
			}),
			env,
		);
		expect(res.status).toBe(200);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", user.authUserId)).toBe(0);
		expect(await count("SELECT COUNT(*) AS c FROM users WHERE id = ?", user.appUserId)).toBe(0);
	});

	it("管理者ロールは 403 で退会拒否（一時措置）", async () => {
		const admin = await createAndLoginUser({ role: "admin" });

		const res = await app.fetch(
			deleteMe({
				cookie: admin.cookie,
				body: { email: admin.email },
				origin: ALLOWED_ORIGIN,
			}),
			env,
		);
		expect(res.status).toBe(403);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", admin.authUserId)).toBe(1);
	});

	it("CSRF: Origin 欠如は 403 で退会しない", async () => {
		const user = await createAndLoginUser();

		const res = await app.fetch(
			deleteMe({ cookie: user.cookie, body: { email: user.email }, origin: null }),
			env,
		);
		expect(res.status).toBe(403);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", user.authUserId)).toBe(1);
	});

	it("CSRF: 許可外 Origin は 403 で退会しない", async () => {
		const user = await createAndLoginUser();

		const res = await app.fetch(
			deleteMe({
				cookie: user.cookie,
				body: { email: user.email },
				origin: "https://evil.example.com",
			}),
			env,
		);
		expect(res.status).toBe(403);
		expect(await count("SELECT COUNT(*) AS c FROM auth_users WHERE id = ?", user.authUserId)).toBe(1);
	});

	it("未認証は 401（Origin は正当・cookie なし）", async () => {
		const res = await app.fetch(
			deleteMe({ body: { email: "someone@example.com" }, origin: ALLOWED_ORIGIN }),
			env,
		);
		expect(res.status).toBe(401);
	});
});
