import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../index';
import {
	approveAdvice,
	approveConsultation,
	rejectAdvice,
	rejectConsultation,
	setupIntegrationTest,
} from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError, assertValidationError } from '../helpers/assert-helper';

describe('Consultations API - Advice List (GET /:id/advices)', () => {
	let user: Awaited<ReturnType<typeof createAndLoginUser>>;
	let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
	let noPublicUser: Awaited<ReturnType<typeof createAndLoginUser>>;
	let consultationId: number;
	let userIdFilterConsultationId: number;
	let draftConsultationId: number;
	let hiddenConsultationId: number;
	let tagId: number;
	const draftAdviceBody = '下書き回答（一覧非表示）のテストです。10文字以上あります。';
	const hiddenAdviceBody = '非表示回答（一覧非表示）のテストです。10文字以上あります。';
	const filterTargetPublicBodies = [
		'userId対象ユーザー公開回答1。10文字以上あります。',
		'userId対象ユーザー公開回答2。10文字以上あります。',
		'userId対象ユーザー公開回答3。10文字以上あります。',
	];
	const filterOtherPublicBodies = [
		'userId他ユーザー公開回答1。10文字以上あります。',
		'userId他ユーザー公開回答2。10文字以上あります。',
	];
	const filterTargetDraftBody = 'userId対象ユーザー下書き回答。10文字以上あります。';
	const filterTargetHiddenBody = 'userId対象ユーザー非表示回答。10文字以上あります。';
	const noPublicDraftBody = '公開なしユーザー下書き回答。10文字以上あります。';
	const noPublicHiddenBody = '公開なしユーザー非表示回答。10文字以上あります。';

	beforeAll(async () => {
		await setupIntegrationTest();

		user = await createAndLoginUser();
		attacker = await createAndLoginUser({ name: 'Attacker' });
		noPublicUser = await createAndLoginUser({ name: 'NoPublicUser' });

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
		await approveConsultation(consultationId);

		for (let i = 1; i <= 25; i++) {
			const adviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
				cookie: user.cookie,
				body: {
					body: `公開回答 ${i}。ページネーション検証用の本文です。`,
					draft: false,
				},
			}), env);
			expect(adviceRes.status).toBe(201);
			const advice = await adviceRes.json() as any;
			await approveAdvice(advice.id);
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
		await approveAdvice(hiddenAdvice.id);
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
		await approveConsultation(hiddenConsultationId);
		await env.DB
			.prepare("UPDATE consultations SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
			.bind(hiddenConsultationId)
			.run();

		const userIdFilterConsultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
			cookie: user.cookie,
			body: {
				title: 'userIdフィルタ検証用相談',
				body: 'userIdで回答を絞り込む挙動を検証するための本文です。',
				draft: false,
				tagIds: [tagId],
			},
		}), env);
		expect(userIdFilterConsultationRes.status).toBe(201);
		const userIdFilterConsultation = await userIdFilterConsultationRes.json() as any;
		userIdFilterConsultationId = userIdFilterConsultation.id;
		await approveConsultation(userIdFilterConsultationId);

		for (const body of filterTargetPublicBodies) {
			const adviceRes = await app.fetch(createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advice`, 'POST', {
				cookie: user.cookie,
				body: {
					body,
					draft: false,
				},
			}), env);
			expect(adviceRes.status).toBe(201);
			const advice = await adviceRes.json() as any;
			await approveAdvice(advice.id);
		}

		const filterTargetDraftRes = await app.fetch(createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advice`, 'POST', {
			cookie: user.cookie,
			body: {
				body: filterTargetDraftBody,
				draft: true,
			},
		}), env);
		expect(filterTargetDraftRes.status).toBe(201);

		const filterTargetHiddenRes = await app.fetch(createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advice`, 'POST', {
			cookie: user.cookie,
			body: {
				body: filterTargetHiddenBody,
				draft: false,
			},
		}), env);
		expect(filterTargetHiddenRes.status).toBe(201);
		const filterTargetHiddenAdvice = await filterTargetHiddenRes.json() as any;
		await approveAdvice(filterTargetHiddenAdvice.id);
		await env.DB
			.prepare("UPDATE advices SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
			.bind(filterTargetHiddenAdvice.id)
			.run();

		for (const body of filterOtherPublicBodies) {
			const adviceRes = await app.fetch(createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advice`, 'POST', {
				cookie: attacker.cookie,
				body: {
					body,
					draft: false,
				},
			}), env);
			expect(adviceRes.status).toBe(201);
			const advice = await adviceRes.json() as any;
			await approveAdvice(advice.id);
		}

		const noPublicDraftRes = await app.fetch(createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advice`, 'POST', {
			cookie: noPublicUser.cookie,
			body: {
				body: noPublicDraftBody,
				draft: true,
			},
		}), env);
		expect(noPublicDraftRes.status).toBe(201);

		const noPublicHiddenRes = await app.fetch(createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advice`, 'POST', {
			cookie: noPublicUser.cookie,
			body: {
				body: noPublicHiddenBody,
				draft: false,
			},
		}), env);
		expect(noPublicHiddenRes.status).toBe(201);
		const noPublicHiddenAdvice = await noPublicHiddenRes.json() as any;
		await approveAdvice(noPublicHiddenAdvice.id);
		await env.DB
			.prepare("UPDATE advices SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
			.bind(noPublicHiddenAdvice.id)
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
		expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
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
		assertValidationError(invalidPageBody);

		const invalidLimitReq = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { limit: 101 },
		});
		const invalidLimitRes = await app.fetch(invalidLimitReq, env);
		expect(invalidLimitRes.status).toBe(400);
		const invalidLimitBody = await invalidLimitRes.json() as any;
		assertValidationError(invalidLimitBody);
	});

	it('userId指定: 公開回答のうち指定ユーザーの回答のみ取得できる', async () => {
		const req = createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { userId: user.appUserId.toString(), limit: 100 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;

		expect(body.data.length).toBe(filterTargetPublicBodies.length);
		expect(body.pagination.total_items).toBe(filterTargetPublicBodies.length);
		expect(body.data.every((advice: any) => advice.author?.id === user.appUserId)).toBe(true);

		const returnedBodies = body.data.map((advice: any) => advice.body);
		for (const expectedBody of filterTargetPublicBodies) {
			expect(returnedBodies).toContain(expectedBody);
		}
		for (const otherBody of filterOtherPublicBodies) {
			expect(returnedBodies).not.toContain(otherBody);
		}
	});

	it('userId指定: 指定ユーザーの下書き/非表示回答は含まれない', async () => {
		const req = createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { userId: user.appUserId.toString(), limit: 100 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		const returnedBodies = body.data.map((advice: any) => advice.body);

		expect(returnedBodies).not.toContain(filterTargetDraftBody);
		expect(returnedBodies).not.toContain(filterTargetHiddenBody);
	});

	it('userId指定: 指定ユーザーに公開回答がない場合は空配列を返す', async () => {
		const req = createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { userId: noPublicUser.appUserId.toString(), limit: 100 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;

		expect(body.data).toEqual([]);
		expect(body.pagination.total_items).toBe(0);
		expect(body.pagination.total_pages).toBe(0);
		expect(body.pagination.has_next).toBe(false);
		expect(body.pagination.has_prev).toBe(false);
	});

	it('userId + page/limit の組み合わせでページネーションできる', async () => {
		const req = createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { userId: user.appUserId.toString(), limit: 2, page: 2 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;

		expect(body.data.length).toBe(1);
		expect(body.pagination.current_page).toBe(2);
		expect(body.pagination.per_page).toBe(2);
		expect(body.pagination.total_items).toBe(filterTargetPublicBodies.length);
		expect(body.pagination.total_pages).toBe(2);
		expect(body.pagination.has_prev).toBe(true);
		expect(body.pagination.has_next).toBe(false);
		expect(body.data.every((advice: any) => advice.author?.id === user.appUserId)).toBe(true);
	});

	it('不正なuserIdは400エラーを返す', async () => {
		const invalidUserIds = ['abc', '0', '-1'];

		for (const invalidUserId of invalidUserIds) {
			const req = createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advices`, 'GET', {
				cookie: user.cookie,
				queryParams: { userId: invalidUserId },
			});
			const res = await app.fetch(req, env);
			expect(res.status).toBe(400);
			const body = await res.json() as any;
			assertValidationError(body);
		}
	});

	it('存在しないuserIdは200かつ空配列を返す', async () => {
		const req = createApiRequest(`/api/consultations/${userIdFilterConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
			queryParams: { userId: 99999999 },
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(200);
		const body = await res.json() as any;

		expect(body.data).toEqual([]);
		expect(body.pagination.total_items).toBe(0);
		expect(body.pagination.total_pages).toBe(0);
	});

	it('認証なしは401エラーを返す', async () => {
		const req = createApiRequest(`/api/consultations/${consultationId}/advices`, 'GET');
		const res = await app.fetch(req, env);
		expect(res.status).toBe(401);
		const body = await res.json() as any;
		assertUnauthorizedError(body);
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
	
	it('本人の非表示相談の回答一覧も取得できない（404）：モデレーションによる非表示は著者にも効かせる', async () => {
		const req = createApiRequest(`/api/consultations/${hiddenConsultationId}/advices`, 'GET', {
			cookie: user.cookie,
		});
		const res = await app.fetch(req, env);
		expect(res.status).toBe(404);
		const body = await res.json() as any;
		expect(body.error).toBe('NotFoundError');
	});

	// #179 Phase2: 本人は自分の投稿チェック中/公開見送りの相談の回答一覧にアクセスできる
	// (getConsultation と同じ assertConsultationReadableOrThrow の本人バイパス)。他人は従来通り404でfail-closed。
	it('投稿チェック中(pending)の相談の回答一覧は本人なら取得でき、他人は404（#179 Phase2）', async () => {
		const createRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
			cookie: user.cookie,
			body: {
				title: 'pending相談',
				body: '投稿チェック中の相談は本人のみ回答一覧にアクセスできます。10文字以上あります。',
				draft: false,
				tagIds: [tagId],
			},
		}), env);
		expect(createRes.status).toBe(201);
		const created = await createRes.json() as any;

		// 本人: 自分の投稿チェック中の相談なら回答一覧にアクセスできる（中身は承認済みのみ）
		const ownerRes = await app.fetch(createApiRequest(`/api/consultations/${created.id}/advices`, 'GET', {
			cookie: user.cookie,
		}), env);
		expect(ownerRes.status).toBe(200);
		const ownerBody = await ownerRes.json() as any;
		expect(Array.isArray(ownerBody.data)).toBe(true);

		// 他人: 公開前のためアクセス不可（fail-closed）
		const attackerRes = await app.fetch(createApiRequest(`/api/consultations/${created.id}/advices`, 'GET', {
			cookie: attacker.cookie,
		}), env);
		expect(attackerRes.status).toBe(404);
		const attackerBody = await attackerRes.json() as any;
		expect(attackerBody.error).toBe('NotFoundError');
	});

	it('公開見送り(rejected)の相談の回答一覧は本人なら取得でき、他人は404（#179 Phase2）', async () => {
		const createRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
			cookie: user.cookie,
			body: {
				title: 'rejected相談',
				body: '公開見送りの相談も本人のみ回答一覧にアクセスできます。10文字以上あります。',
				draft: false,
				tagIds: [tagId],
			},
		}), env);
		expect(createRes.status).toBe(201);
		const created = await createRes.json() as any;
		await rejectConsultation(created.id);

		const ownerRes = await app.fetch(createApiRequest(`/api/consultations/${created.id}/advices`, 'GET', {
			cookie: user.cookie,
		}), env);
		expect(ownerRes.status).toBe(200);

		const attackerRes = await app.fetch(createApiRequest(`/api/consultations/${created.id}/advices`, 'GET', {
			cookie: attacker.cookie,
		}), env);
		expect(attackerRes.status).toBe(404);
	});

	describe('content_check による advice 可視性フィルタ', () => {
		const approvedAdviceBody = 'approved な公開回答です。10文字以上あります。';
		const pendingAdviceBody = 'pending な公開回答です。10文字以上あります。';
		const rejectedAdviceBody = 'rejected な公開回答です。10文字以上あります。';
		const pendingAttackerBody = 'attacker の pending 回答です。10文字以上あります。';
		let visibilityConsultationId: number;

		beforeAll(async () => {
			const consultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
				cookie: user.cookie,
				body: {
					title: 'advice 可視性検証用相談',
					body: 'content_check による advice 可視性を検証する本文です。',
					draft: false,
					tagIds: [tagId],
				},
			}), env);
			expect(consultationRes.status).toBe(201);
			const consultation = await consultationRes.json() as any;
			visibilityConsultationId = consultation.id;
			await approveConsultation(visibilityConsultationId);

			const approvedRes = await app.fetch(createApiRequest(`/api/consultations/${visibilityConsultationId}/advice`, 'POST', {
				cookie: user.cookie,
				body: { body: approvedAdviceBody, draft: false },
			}), env);
			expect(approvedRes.status).toBe(201);
			await approveAdvice((await approvedRes.json() as any).id);

			const pendingRes = await app.fetch(createApiRequest(`/api/consultations/${visibilityConsultationId}/advice`, 'POST', {
				cookie: user.cookie,
				body: { body: pendingAdviceBody, draft: false },
			}), env);
			expect(pendingRes.status).toBe(201);
			// pending のまま放置

			const rejectedRes = await app.fetch(createApiRequest(`/api/consultations/${visibilityConsultationId}/advice`, 'POST', {
				cookie: user.cookie,
				body: { body: rejectedAdviceBody, draft: false },
			}), env);
			expect(rejectedRes.status).toBe(201);
			await rejectAdvice((await rejectedRes.json() as any).id);

			const pendingAttackerRes = await app.fetch(createApiRequest(`/api/consultations/${visibilityConsultationId}/advice`, 'POST', {
				cookie: attacker.cookie,
				body: { body: pendingAttackerBody, draft: false },
			}), env);
			expect(pendingAttackerRes.status).toBe(201);
		});

		// #179 Phase2: 相談詳細の回答一覧は「公開(承認済み) + 閲覧者本人の非下書き回答」を可視にする。
		// 他人の未公開は依然として漏らさない(fail-closed)。viewerId ベースの OR 可視性の検証。
		it('他者視点では approved な advice と「自分の未公開回答」のみが一覧に含まれる(#179 Phase2)', async () => {
			// attacker は user の相談を閲覧。user の pending/rejected は見えないが、
			// attacker 自身が投稿した投稿チェック中の回答は本人分として inline 表示される。
			const req = createApiRequest(`/api/consultations/${visibilityConsultationId}/advices`, 'GET', {
				cookie: attacker.cookie,
				queryParams: { limit: 100 },
			});
			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);
			const body = await res.json() as any;
			const bodies = body.data.map((a: any) => a.body);
			expect(bodies).toContain(approvedAdviceBody);
			expect(bodies).toContain(pendingAttackerBody); // 自分の投稿チェック中回答は見える
			expect(bodies).not.toContain(pendingAdviceBody); // 他人(user)の未公開は見えない
			expect(bodies).not.toContain(rejectedAdviceBody);
			expect(body.pagination.total_items).toBe(2);

			// 自分の未公開回答には review_status が付き、承認済みは approved に寄る
			const attackerPending = body.data.find((a: any) => a.body === pendingAttackerBody);
			expect(attackerPending.review_status).toBe('pending');
			const approved = body.data.find((a: any) => a.body === approvedAdviceBody);
			expect(approved.review_status).toBe('approved');
		});

		it('author 本人視点では自分の pending / rejected advice も相談詳細の一覧に inline 表示される(#179 Phase2)', async () => {
			const req = createApiRequest(`/api/consultations/${visibilityConsultationId}/advices`, 'GET', {
				cookie: user.cookie,
				queryParams: { limit: 100 },
			});
			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);
			const body = await res.json() as any;
			const bodies = body.data.map((a: any) => a.body);
			expect(bodies).toContain(approvedAdviceBody);
			expect(bodies).toContain(pendingAdviceBody);
			expect(bodies).toContain(rejectedAdviceBody);
			expect(bodies).not.toContain(pendingAttackerBody); // 他人(attacker)の未公開は見えない
			expect(body.pagination.total_items).toBe(3);

			const pending = body.data.find((a: any) => a.body === pendingAdviceBody);
			expect(pending.review_status).toBe('pending');
			const rejected = body.data.find((a: any) => a.body === rejectedAdviceBody);
			expect(rejected.review_status).toBe('rejected');
		});

		it('GET /api/consultations/:id の advices にも同じ viewerId 可視性が効く(#179 Phase2)', async () => {
			const req = createApiRequest(`/api/consultations/${visibilityConsultationId}`, 'GET', {
				cookie: attacker.cookie,
			});
			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);
			const body = await res.json() as any;
			const advices = body.advices ?? [];
			const bodies = advices.map((a: any) => a.body);
			expect(bodies).toContain(approvedAdviceBody);
			expect(bodies).toContain(pendingAttackerBody); // 閲覧者本人(attacker)の未公開は詳細でも見える
			expect(bodies).not.toContain(pendingAdviceBody);
			expect(bodies).not.toContain(rejectedAdviceBody);
		});

		it('userId 絞り込みと viewerId を併用しても他人の未公開は漏れない（?userId=<他人>, #179 Phase2）', async () => {
			// attacker が user の回答だけを絞り込んで取得しようとしても、user の投稿チェック中/公開見送りは出さず承認済みのみ。
			// viewerId(=attacker) の本人ORは author=userId(=user) と AND されて自分の行にしか効かないため漏れない(fail-closed)。
			const req = createApiRequest(`/api/consultations/${visibilityConsultationId}/advices`, 'GET', {
				cookie: attacker.cookie,
				queryParams: { userId: user.appUserId, limit: 100 },
			});
			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);
			const body = await res.json() as any;
			const bodies = body.data.map((a: any) => a.body);
			expect(bodies).toContain(approvedAdviceBody);
			expect(bodies).not.toContain(pendingAdviceBody);
			expect(bodies).not.toContain(rejectedAdviceBody);
			expect(bodies).not.toContain(pendingAttackerBody); // userId=user 絞り込みなので attacker 自身の回答も出ない
			expect(body.pagination.total_items).toBe(1);
		});
	});
});
