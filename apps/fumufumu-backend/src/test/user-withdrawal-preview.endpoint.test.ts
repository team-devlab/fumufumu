import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../index";
import { createAndLoginUser } from "./helpers/auth-helper";
import {
	approveAdvice,
	approveConsultation,
	forceSetDisabled,
	setupIntegrationTest,
} from "./helpers/db-helper";
import { createApiRequest } from "./helpers/request-helper";

/**
 * 退会プレビュー GET /api/users/me/withdrawal-preview の API テスト。
 * 削除/匿名化件数を返し、認証は退会と同じく BAN 中でも通す（GET のため CSRF は不要）。
 * 件数の分岐網羅は user-withdrawal-content が持つ。ここは HTTP 配線と代表ケースを確認する。
 */

const BODY = "テスト用の本文です。十分な長さを確保しています。";

type PreviewResponse = {
	consultations: { delete: number; anonymize: number };
	advices: { delete: number; anonymize: number };
	drafts: { delete: number };
};

const getPreview = (cookie?: string) =>
	app.fetch(createApiRequest("/api/users/me/withdrawal-preview", "GET", { cookie }), env);

const createTag = async (name: string): Promise<number> => {
	await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(name).run();
	const row = (await env.DB.prepare("SELECT id FROM tags WHERE name = ?")
		.bind(name)
		.first()) as { id: number };
	return row.id;
};

const publishConsultation = async (cookie: string, tagId: number, title: string): Promise<number> => {
	const res = await app.fetch(
		createApiRequest("/api/consultations", "POST", {
			cookie,
			body: { title, body: BODY, draft: false, tagIds: [tagId] },
		}),
		env,
	);
	expect(res.status).toBe(201);
	return ((await res.json()) as { id: number }).id;
};

const draftConsultation = async (cookie: string, title: string): Promise<number> => {
	const res = await app.fetch(
		createApiRequest("/api/consultations", "POST", {
			cookie,
			body: { title, body: BODY, draft: true },
		}),
		env,
	);
	expect(res.status).toBe(201);
	return ((await res.json()) as { id: number }).id;
};

const addAdvice = async (cookie: string, consultationId: number, draft = false): Promise<number> => {
	const res = await app.fetch(
		createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
			cookie,
			body: { body: BODY, draft },
		}),
		env,
	);
	expect(res.status).toBe(201);
	return ((await res.json()) as { id: number }).id;
};

describe("GET /api/users/me/withdrawal-preview（退会プレビュー）", () => {
	beforeAll(async () => {
		await setupIntegrationTest();
	});

	it("削除/匿名化の件数を内訳つきで返す", async () => {
		const user = await createAndLoginUser();
		const other = await createAndLoginUser();
		const tagId = await createTag(`preview-${Date.now()}`);

		// 削除: 下書き相談1
		await draftConsultation(user.cookie, "プレビュー下書き");

		// 削除: 回答0の公開相談1
		await publishConsultation(user.cookie, tagId, "プレビュー回答0");

		// 匿名化: 回答あり公開相談1（他者approved回答）
		const answered = await publishConsultation(user.cookie, tagId, "プレビュー回答あり");
		await approveConsultation(answered);
		const otherAdvice = await addAdvice(other.cookie, answered);
		await approveAdvice(otherAdvice);

		// 他者の残る相談に、本人の公開アドバイス1（匿名化）＋下書きアドバイス1（削除）
		const otherConsultation = await publishConsultation(other.cookie, tagId, "プレビュー他者相談");
		await approveConsultation(otherConsultation);
		await addAdvice(user.cookie, otherConsultation, false);
		await addAdvice(user.cookie, otherConsultation, true);

		const res = await getPreview(user.cookie);
		expect(res.status).toBe(200);
		const data = (await res.json()) as PreviewResponse;

		expect(data.consultations).toEqual({ delete: 1, anonymize: 1 });
		expect(data.advices).toEqual({ delete: 0, anonymize: 1 });
		expect(data.drafts).toEqual({ delete: 2 });
	});

	it("投稿が無ければすべて0を返す", async () => {
		const user = await createAndLoginUser();

		const res = await getPreview(user.cookie);
		expect(res.status).toBe(200);
		const data = (await res.json()) as PreviewResponse;

		expect(data.consultations).toEqual({ delete: 0, anonymize: 0 });
		expect(data.advices).toEqual({ delete: 0, anonymize: 0 });
		expect(data.drafts).toEqual({ delete: 0 });
	});

	it("BAN(disabled)中でもプレビューできる", async () => {
		const user = await createAndLoginUser();
		await forceSetDisabled(user.appUserId);

		const res = await getPreview(user.cookie);
		expect(res.status).toBe(200);
	});

	it("未認証は 401", async () => {
		const res = await getPreview();
		expect(res.status).toBe(401);
	});
});
