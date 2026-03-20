import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import { setupIntegrationTest } from "../helpers/db-helper";
import { createAndLoginUser } from "../helpers/auth-helper";
import { createApiRequest } from "../helpers/request-helper";
import { assertUnauthorizedError, assertValidationError } from "../helpers/assert-helper";

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

		const approveReq = createApiRequest(`/api/admin/content-check/consultations/${consultationId}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "approved",
			},
		});
		const approveRes = await app.fetch(approveReq, env);
		expect(approveRes.status).toBe(200);
	});

	it("pendingアドバイスの一覧を取得できる", async () => {
		const adviceReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
			cookie: user.cookie,
			body: {
				body: "pendingとして残るアドバイス本文です。10文字以上あります。",
				draft: false,
			},
		});
		const adviceRes = await app.fetch(adviceReq, env);
		expect(adviceRes.status).toBe(201);
		const advice = await adviceRes.json() as { id: number };

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

		const included = data.advices.find((adviceItem) => adviceItem.id === advice.id);

		expect(included).toBeDefined();
		expect(included?.consultation_id).toBe(consultationId);
		expect(included?.status).toBe("pending");
		expect(new Date(included!.created_at).toString()).not.toBe("Invalid Date");
	});

	it("detail: ids指定でpending詳細とmissingを返す", async () => {
		const pendingAdviceReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
			cookie: user.cookie,
			body: {
				body: "detailで返すpendingアドバイス本文です。10文字以上あります。",
				draft: false,
			},
		});
		const pendingAdviceRes = await app.fetch(pendingAdviceReq, env);
		expect(pendingAdviceRes.status).toBe(201);
		const pendingAdvice = await pendingAdviceRes.json() as { id: number };

		const req = createApiRequest("/api/admin/content-check/advices", "GET", {
			cookie: user.cookie,
			queryParams: {
				view: "detail",
				ids: `${pendingAdvice.id},99999999`,
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);

		const data = await res.json() as {
			advices: Array<{
				id: number;
				consultation_id: number;
				body: string;
				author_id: number | null;
				status: string;
				created_at: string;
			}>;
			missing_ids: number[];
			non_pending: Array<{ id: number; current_status: string }>;
		};

		expect(data.advices.some((item) => item.id === pendingAdvice.id)).toBe(true);
		expect(data.missing_ids).toContain(99999999);
		// TODO: advice decision APIを実装後、non_pending（approved/rejected）の検証を追加する。
		expect(Array.isArray(data.non_pending)).toBe(true);
	});

	it("detail: ids 未指定は400エラー", async () => {
		const req = createApiRequest("/api/admin/content-check/advices", "GET", {
			cookie: user.cookie,
			queryParams: {
				view: "detail",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(400);

		const data = await res.json() as unknown;
		assertValidationError(data);
	});

	it("認証なしは401エラー", async () => {
		const req = createApiRequest("/api/admin/content-check/advices", "GET");
		const res = await app.fetch(req, env);
		expect(res.status).toBe(401);

		const data = await res.json() as unknown;
		assertUnauthorizedError(data);
	});
});
