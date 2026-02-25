import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';

describe('Consultations API - Advice List (GET /:id/advices)', () => {
	let user: Awaited<ReturnType<typeof createAndLoginUser>>;
	let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
	let consultationId: number;
	let draftConsultationId: number;
	let hiddenConsultationId: number;
	let tagId: number;
	const draftAdviceBody = '下書き回答（一覧非表示）のテストです。10文字以上あります。';
	const hiddenAdviceBody = '非表示回答（一覧非表示）のテストです。10文字以上あります。';

	beforeAll(async () => {
		await setupIntegrationTest();

		user = await createAndLoginUser();
		attacker = await createAndLoginUser({ name: 'Attacker' });

		const tagName = `advice-list-test-tag-${Date.now()}`;
		await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagName).run();
		const createdTag = await env.DB
			.prepare('SELECT id FROM tags WHERE name = ?')
			.bind(tagName)
			.first() as { id: number } | null;
		expect(createdTag?.id).toBeDefined();
		tagId = createdTag!.id;

		const consultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
			cookie: user.cookie,
			body: {
				title: '回答一覧ページネーション検証用相談',
				body: '回答一覧ページネーション検証のための本文です。10文字以上あります。',
				draft: false,
				tagIds: [tagId],
			},
		}), env);
		expect(consultationRes.status).toBe(201);
		const consultation = await consultationRes.json() as any;
		consultationId = consultation.id;

		for (let i = 1; i <= 25; i++) {
			const adviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
				cookie: user.cookie,
				body: {
					body: `公開回答 ${i}。ページネーション検証用の本文です。`,
					draft: false,
				},
			}), env);
			expect(adviceRes.status).toBe(201);
		}

		const draftAdviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
			cookie: user.cookie,
			body: {
				body: draftAdviceBody,
				draft: true,
			},
		}), env);
		expect(draftAdviceRes.status).toBe(201);

		const hiddenAdviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
			cookie: user.cookie,
			body: {
				body: hiddenAdviceBody,
				draft: false,
			},
		}), env);
		expect(hiddenAdviceRes.status).toBe(201);
		const hiddenAdvice = await hiddenAdviceRes.json() as any;
		await env.DB
			.prepare("UPDATE advices SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
			.bind(hiddenAdvice.id)
			.run();

		const draftConsultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
			cookie: user.cookie,
			body: {
				title: '他人に見えない下書き相談',
				body: '回答一覧アクセス制御の確認用本文です。10文字以上あります。',
				draft: true,
				tagIds: [tagId],
			},
		}), env);
		expect(draftConsultationRes.status).toBe(201);
		const draftConsultation = await draftConsultationRes.json() as any;
		draftConsultationId = draftConsultation.id;
		
		const hiddenConsultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
			cookie: user.cookie,
			body: {
				title: '他人に見えない非表示相談',
				body: '回答一覧アクセス制御の確認用本文です。10文字以上あります。',
				draft: false,
				tagIds: [tagId],
			},
		}), env);
		expect(hiddenConsultationRes.status).toBe(201);
		const hiddenConsultation = await hiddenConsultationRes.json() as any;
		hiddenConsultationId = hiddenConsultation.id;
		await env.DB
			.prepare("UPDATE consultations SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
			.bind(hiddenConsultationId)
			.run();
	});

	it('デフォルト: page=1, limit=20 で取得できる', async () => {
		const req = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);

		const body = await res.json() as any;
		expect(body).toHaveProperty('pagination');
		expect(body).toHaveProperty('data');
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBe(20);
		expect(body.pagination.current_page).toBe(1);
		expect(body.pagination.per_page).toBe(20);
		expect(body.pagination.total_items).toBe(25);
		expect(body.pagination.total_pages).toBe(2);
		expect(body.pagination.has_next).toBe(true);
		expect(body.pagination.has_prev).toBe(false);
	});

	it('limit=10, page=2 で2ページ目を取得できる', async () => {
		const req = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { limit: 10, page: 2 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);

		const body = await res.json() as any;
		expect(body.data.length).toBe(10);
		expect(body.pagination.current_page).toBe(2);
		expect(body.pagination.per_page).toBe(10);
		expect(body.pagination.has_prev).toBe(true);
		expect(body.pagination.has_next).toBe(true);
	});

	it('下書き/非表示の回答は一覧に含まれない', async () => {
		const req = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { limit: 100 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;

		expect(body.data.length).toBe(25);
		const bodies = body.data.map((a: any) => a.body);
		expect(bodies).not.toContain(draftAdviceBody);
		expect(bodies).not.toContain(hiddenAdviceBody);
	});

	it('存在しないページは空配列を返す', async () => {
		const req = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { page: 999 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;

		expect(body.data).toEqual([]);
		expect(body.pagination.current_page).toBe(999);
		expect(body.pagination.has_next).toBe(false);
	});

	it('不正なpage/limitは400エラーを返す', async () => {
		const invalidPageReq = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { page: 0 },
		});
		const invalidPageRes = await app.fetch(invalidPageReq, env);
		expect(invalidPageRes.status).toBe(400);
		const invalidPageBody = await invalidPageRes.json() as any;
		expect(invalidPageBody.error).toBe('ValidationError');

		const invalidLimitReq = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { limit: 101 },
		});
		const invalidLimitRes = await app.fetch(invalidLimitReq, env);
		expect(invalidLimitRes.status).toBe(400);
		const invalidLimitBody = await invalidLimitRes.json() as any;
		expect(invalidLimitBody.error).toBe('ValidationError');
	});

	it('認証なしは401エラーを返す', async () => {
		const req = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET');
		const res = await app.fetch(req, env);
		expect(res.status).toBe(401);
	});

	it('存在しない相談IDは404エラーを返す', async () => {
		const req = createApiRequest('/api/consultations/999999/advices', 'GET', {
			cookie: user.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(404);
		const body = await res.json() as any;
		expect(body.error).toBe('NotFoundError');
	});

	it('他人の下書き相談の回答一覧は取得できない（404）', async () => {
		const req = createApiRequest(`/api/consultations/${draftConsultationId}/advices`, 'GET', {
			cookie: attacker.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(404);
		const body = await res.json() as any;
		expect(body.error).toBe('NotFoundError');
	});
	
	it('本人の下書き相談の回答一覧は取得できる（200）', async () => {
		const req = createApiRequest(`/api/consultations/${draftConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data).toEqual([]);
		expect(body.pagination.current_page).toBe(1);
		expect(body.pagination.per_page).toBe(20);
		expect(body.pagination.total_items).toBe(0);
		expect(body.pagination.total_pages).toBe(0);
		expect(body.pagination.has_next).toBe(false);
		expect(body.pagination.has_prev).toBe(false);
	});
	
	it('他人の非表示相談の回答一覧は取得できない（404）', async () => {
		const req = createApiRequest(`/api/consultations/${hiddenConsultationId}/advices`, 'GET', {
			cookie: attacker.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(404);
		const body = await res.json() as any;
		expect(body.error).toBe('NotFoundError');
	});
	
	it('本人の非表示相談の回答一覧は取得できる（200）', async () => {
		const req = createApiRequest(`/api/consultations/${hiddenConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data).toEqual([]);
		expect(body.pagination.current_page).toBe(1);
		expect(body.pagination.per_page).toBe(20);
		expect(body.pagination.total_items).toBe(0);
		expect(body.pagination.total_pages).toBe(0);
		expect(body.pagination.has_next).toBe(false);
		expect(body.pagination.has_prev).toBe(false);
	});
});
