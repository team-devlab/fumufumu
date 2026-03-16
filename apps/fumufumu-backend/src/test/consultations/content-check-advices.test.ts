import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import { setupIntegrationTest } from "../helpers/db-helper";
import { createAndLoginUser } from "../helpers/auth-helper";
import { createApiRequest } from "../helpers/request-helper";
import { assertUnauthorizedError } from "../helpers/assert-helper";

describe("Admin Content Check API - Advices", () => {
	let user: Awaited<ReturnType<typeof createAndLoginUser>>;
	let consultationId: number;
	let tagId: number;

	beforeAll(async () => {
		await setupIntegrationTest();
		user = await createAndLoginUser();

		const tagName = `content-check-advice-tag-${Date.now()}`;
		await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(tagName).run();
		const tag = await env.DB
			.prepare("SELECT id FROM tags WHERE name = ?")
			.bind(tagName)
			.first() as { id: number } | null;

		expect(tag?.id).toBeDefined();
		tagId = tag!.id;

		const createConsultationReq = createApiRequest("/api/consultations", "POST", {
			cookie: user.cookie,
			body: {
				title: "advice-content-check-target",
				body: "アドバイス投稿用の相談本文です。十分な文字数を持たせています。",
				draft: false,
				tagIds: [tagId],
			},
		});
		const createConsultationRes = await app.fetch(createConsultationReq, env);
		expect(createConsultationRes.status).toBe(201);
		const createdConsultation = await createConsultationRes.json() as { id: number };
		consultationId = createdConsultation.id;

		await env.DB
			.prepare(
				"UPDATE content_checks SET status = 'approved', checked_at = (cast(unixepoch('subsecond') * 1000 as integer)), updated_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE target_type = 'consultation' AND target_id = ?",
			)
			.bind(consultationId)
			.run();
	});

	it("pendingアドバイスの一覧を取得でき、approvedは含まれない", async () => {
		const pendingAdviceReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
			cookie: user.cookie,
			body: {
				body: "pendingとして残るアドバイス本文です。10文字以上あります。",
				draft: false,
			},
		});
		const pendingAdviceRes = await app.fetch(pendingAdviceReq, env);
		expect(pendingAdviceRes.status).toBe(201);
		const pendingAdvice = await pendingAdviceRes.json() as { id: number };

		const approvedAdviceReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
			cookie: user.cookie,
			body: {
				body: "あとでapprovedに更新するアドバイス本文です。10文字以上あります。",
				draft: false,
			},
		});
		const approvedAdviceRes = await app.fetch(approvedAdviceReq, env);
		expect(approvedAdviceRes.status).toBe(201);
		const approvedAdvice = await approvedAdviceRes.json() as { id: number };

		await env.DB
			.prepare(
				"INSERT INTO content_checks (target_type, target_id, status) VALUES ('advice', ?, 'pending') ON CONFLICT(target_type, target_id) DO UPDATE SET status = 'pending', reason = NULL, checked_at = NULL, updated_at = (cast(unixepoch('subsecond') * 1000 as integer))",
			)
			.bind(pendingAdvice.id)
			.run();

		await env.DB
			.prepare(
				"INSERT INTO content_checks (target_type, target_id, status, checked_at) VALUES ('advice', ?, 'approved', (cast(unixepoch('subsecond') * 1000 as integer))) ON CONFLICT(target_type, target_id) DO UPDATE SET status = 'approved', reason = NULL, checked_at = (cast(unixepoch('subsecond') * 1000 as integer)), updated_at = (cast(unixepoch('subsecond') * 1000 as integer))",
			)
			.bind(approvedAdvice.id)
			.run();

		const req = createApiRequest("/api/admin/content-check/advices", "GET", {
			cookie: user.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);

		const data = await res.json() as {
			advices: Array<{
				id: number;
				consultation_id: number;
				status: string;
				created_at: string;
			}>;
		};

		const included = data.advices.find((advice) => advice.id === pendingAdvice.id);
		const excluded = data.advices.find((advice) => advice.id === approvedAdvice.id);

		expect(included).toBeDefined();
		expect(included?.consultation_id).toBe(consultationId);
		expect(included?.status).toBe("pending");
		expect(new Date(included!.created_at).toString()).not.toBe("Invalid Date");
		expect(excluded).toBeUndefined();
	});

	it("認証なしは401エラー", async () => {
		const req = createApiRequest("/api/admin/content-check/advices", "GET");
		const res = await app.fetch(req, env);
		expect(res.status).toBe(401);

		const data = await res.json() as unknown;
		assertUnauthorizedError(data);
	});
});
