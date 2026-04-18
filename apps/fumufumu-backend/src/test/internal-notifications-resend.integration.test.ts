import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "@/index";
import { setupIntegrationTest } from "@/test/helpers/db-helper";
import { createApiRequest } from "@/test/helpers/request-helper";

const INTERNAL_TOKEN = "test-internal-token";

function createRequest(body?: { targetType: string; targetId: number }) {
	return createApiRequest("/api/internal/notifications/resend", "POST", {
		body: body ?? {
			targetType: "consultation",
			targetId: 999_999_999,
		},
	});
}

function createInternalEnv(): typeof env & {
	NOTIFICATION_INTERNAL_TOKEN?: string;
	RESEND_API_KEY?: string;
	RESEND_FROM_EMAIL?: string;
	RESEND_TIMEOUT_MS?: string;
} {
	return {
		...env,
		NOTIFICATION_INTERNAL_TOKEN: INTERNAL_TOKEN,
		RESEND_API_KEY: "re_test_key",
		RESEND_FROM_EMAIL: "onboarding@resend.dev",
	};
}

function createAuthorizedRequest(body?: { targetType: string; targetId: number }) {
	const req = createRequest(body);
	req.headers.set("Authorization", `Bearer ${INTERNAL_TOKEN}`);
	return req;
}

describe("Internal Notifications API", () => {
	beforeAll(async () => {
		await setupIntegrationTest();
	});

	it("Authorization ヘッダーなしは 401 を返す", async () => {
		const req = createRequest();
		const res = await app.fetch(req, createInternalEnv());

		expect(res.status).toBe(401);
	});

	it("不正な Bearer トークンは 401 を返す", async () => {
		const req = createRequest();
		req.headers.set("Authorization", "Bearer wrong-token");

		const res = await app.fetch(req, createInternalEnv());
		expect(res.status).toBe(401);
	});

	it("targetType が不正な場合は 400 を返す", async () => {
		const req = createAuthorizedRequest({
			targetType: "invalid",
			targetId: 1,
		});
		const res = await app.fetch(req, createInternalEnv());

		expect(res.status).toBe(400);
	});

	it("targetId が 1 未満の場合は 400 を返す", async () => {
		const req = createAuthorizedRequest({
			targetType: "consultation",
			targetId: 0,
		});
		const res = await app.fetch(req, createInternalEnv());

		expect(res.status).toBe(400);
	});

	it("NOTIFICATION_INTERNAL_TOKEN が未設定の場合は 500 を返す", async () => {
		const req = createRequest();
		const runtimeEnv = createInternalEnv();
		delete runtimeEnv.NOTIFICATION_INTERNAL_TOKEN;

		const res = await app.fetch(req, runtimeEnv);
		expect(res.status).toBe(500);

		const json = (await res.json()) as { message: string };
		expect(json.message).toContain("NOTIFICATION_INTERNAL_TOKEN");
	});

	it("RESEND_API_KEY が未設定の場合は 500 を返す", async () => {
		const req = createAuthorizedRequest();
		const runtimeEnv = createInternalEnv();
		delete runtimeEnv.RESEND_API_KEY;

		const res = await app.fetch(req, runtimeEnv);
		expect(res.status).toBe(500);

		const json = (await res.json()) as { message: string };
		expect(json.message).toContain("RESEND_API_KEY");
	});

	it("RESEND_FROM_EMAIL が未設定の場合は 500 を返す", async () => {
		const req = createAuthorizedRequest();
		const runtimeEnv = createInternalEnv();
		delete runtimeEnv.RESEND_FROM_EMAIL;

		const res = await app.fetch(req, runtimeEnv);
		expect(res.status).toBe(500);

		const json = (await res.json()) as { message: string };
		expect(json.message).toContain("RESEND_FROM_EMAIL");
	});

	it("RESEND_TIMEOUT_MS が不正な値の場合は 500 を返す", async () => {
		const req = createAuthorizedRequest();
		const runtimeEnv = createInternalEnv();
		runtimeEnv.RESEND_TIMEOUT_MS = "0";

		const res = await app.fetch(req, runtimeEnv);
		expect(res.status).toBe(500);

		const json = (await res.json()) as { message: string };
		expect(json.message).toContain("RESEND_TIMEOUT_MS");
	});

	it("認証成功時に resend を実行し JSON を返す", async () => {
		const req = createAuthorizedRequest();

		const res = await app.fetch(req, createInternalEnv());
		expect(res.status).toBe(200);

		const json = (await res.json()) as {
			sent: boolean;
			targetType: string;
			targetId: number;
			reason?: string;
		};
		expect(json.sent).toBe(false);
		expect(json.targetType).toBe("consultation");
		expect(json.targetId).toBe(999_999_999);
		expect(json.reason).toBeDefined();
	});
});
