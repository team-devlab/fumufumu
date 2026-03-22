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

	const createPendingAdvice = async (body: string) => {
		const adviceReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
			cookie: user.cookie,
			body: {
				body,
				draft: false,
			},
		});
		const adviceRes = await app.fetch(adviceReq, env);
		expect(adviceRes.status).toBe(201);
		return await adviceRes.json() as { id: number };
	};

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
		const advice = await createPendingAdvice("pendingとして残るアドバイス本文です。10文字以上あります。");

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

	it("summary: view=summary 明示指定でも一覧を取得できる", async () => {
		const req = createApiRequest("/api/admin/content-check/advices", "GET", {
			cookie: user.cookie,
			queryParams: {
				view: "summary",
			},
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
		expect(Array.isArray(data.advices)).toBe(true);
	});

	it("detail: ids指定でpending詳細とmissingを返す", async () => {
		const pendingAdvice = await createPendingAdvice("detailで返すpendingアドバイス本文です。10文字以上あります。");
		const approvedAdvice = await createPendingAdvice("detailでnon_pending検証に使うアドバイス本文です。10文字以上あります。");
		const approveReq = createApiRequest(`/api/admin/content-check/advices/${approvedAdvice.id}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "approved",
			},
		});
		const approveRes = await app.fetch(approveReq, env);
		expect(approveRes.status).toBe(200);

		const req = createApiRequest("/api/admin/content-check/advices", "GET", {
			cookie: user.cookie,
			queryParams: {
				view: "detail",
				ids: `${pendingAdvice.id},${approvedAdvice.id},99999999`,
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

		const pendingItem = data.advices.find((item) => item.id === pendingAdvice.id);
		expect(pendingItem).toBeDefined();
		expect(pendingItem?.status).toBe("pending");
		expect(pendingItem?.body).toBe("detailで返すpendingアドバイス本文です。10文字以上あります。");
		expect(new Date(pendingItem!.created_at).toString()).not.toBe("Invalid Date");
		expect(data.missing_ids).toContain(99999999);
		expect(data.non_pending).toContainEqual({ id: approvedAdvice.id, current_status: "approved" });
	});

	it("decision: approvedに更新できる", async () => {
		const created = await createPendingAdvice("decisionでapproved検証に使うアドバイス本文です。10文字以上あります。");

		const req = createApiRequest(`/api/admin/content-check/advices/${created.id}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "approved",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);

		const data = await res.json() as {
			advice_id: number;
			status: string;
			reason: string | null;
			checked_at: string | null;
			updated_at: string;
		};

		expect(data.advice_id).toBe(created.id);
		expect(data.status).toBe("approved");
		expect(data.reason).toBeNull();
		expect(data.checked_at).not.toBeNull();
		expect(new Date(data.updated_at).toString()).not.toBe("Invalid Date");
	});

	it("decision: rejected + reason で更新できる", async () => {
		const created = await createPendingAdvice("decisionでrejected検証に使うアドバイス本文です。10文字以上あります。");

		const req = createApiRequest(`/api/admin/content-check/advices/${created.id}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "rejected",
				reason: "ガイドライン違反のため却下",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);

		const data = await res.json() as {
			advice_id: number;
			status: string;
			reason: string | null;
			checked_at: string | null;
			updated_at: string;
		};

		expect(data.advice_id).toBe(created.id);
		expect(data.status).toBe("rejected");
		expect(data.reason).toBe("ガイドライン違反のため却下");
		expect(data.checked_at).not.toBeNull();
		expect(new Date(data.updated_at).toString()).not.toBe("Invalid Date");
	});

	it("decision: rejected で reason 未指定は400エラー", async () => {
		const created = await createPendingAdvice("decisionでreason必須検証に使うアドバイス本文です。10文字以上あります。");

		const req = createApiRequest(`/api/admin/content-check/advices/${created.id}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "rejected",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(400);

		const data = await res.json() as unknown;
		assertValidationError(data);
	});

	it("decision: すでに処理済みのアドバイスに対しては404エラー", async () => {
		const created = await createPendingAdvice("decisionで二重判定検証に使うアドバイス本文です。10文字以上あります。");

		const firstReq = createApiRequest(`/api/admin/content-check/advices/${created.id}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "approved",
			},
		});
		const firstRes = await app.fetch(firstReq, env);
		expect(firstRes.status).toBe(200);

		const secondReq = createApiRequest(`/api/admin/content-check/advices/${created.id}/decision`, "POST", {
			cookie: user.cookie,
			body: {
				decision: "rejected",
				reason: "二重判定の確認",
			},
		});
		const secondRes = await app.fetch(secondReq, env);
		expect(secondRes.status).toBe(404);

		const data = await secondRes.json() as { error: string };
		expect(data.error).toBe("NotFoundError");
	});

	it("decision: 存在しないアドバイスに対しては404エラー", async () => {
		const req = createApiRequest("/api/admin/content-check/advices/99999999/decision", "POST", {
			cookie: user.cookie,
			body: {
				decision: "approved",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(404);

		const data = await res.json() as { error: string };
		expect(data.error).toBe("NotFoundError");
	});

	it("detail: ids が不正値のときは400エラー", async () => {
		const req = createApiRequest("/api/admin/content-check/advices", "GET", {
			cookie: user.cookie,
			queryParams: {
				view: "detail",
				ids: "abc,1",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(400);

		const data = await res.json() as unknown;
		assertValidationError(data);
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

	it("decision: 認証なしは401エラー", async () => {
		const req = createApiRequest("/api/admin/content-check/advices/1/decision", "POST", {
			body: {
				decision: "approved",
			},
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(401);

		const data = await res.json() as unknown;
		assertUnauthorizedError(data);
	});
});
