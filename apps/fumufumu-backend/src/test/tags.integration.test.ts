import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';
import { setupIntegrationTest } from './helpers/db-helper';
import { createAndLoginUser } from './helpers/auth-helper';
import { createApiRequest } from './helpers/request-helper';
import { assertUnauthorizedError } from './helpers/assert-helper';

describe('Tags API Integration Tests', () => {
	let sessionCookie: string | null = null;

	beforeAll(async () => {
		await setupIntegrationTest();

		// テストユーザーを作成してログイン
		const user = await createAndLoginUser({
			name: 'Test User for Tags',
			email: `tags-test-${Date.now()}@example.com`,
		});
		sessionCookie = user.cookie;
		expect(sessionCookie).toBeTruthy();

		// テスト用タグをDBに直接挿入
		const db = env.DB;
		await db.prepare("INSERT INTO tags (name, sort_order) VALUES (?, ?)").bind('キャリア', 10).run();
		await db.prepare("INSERT INTO tags (name, sort_order) VALUES (?, ?)").bind('人間関係', 20).run();
		await db.prepare("INSERT INTO tags (name, sort_order) VALUES (?, ?)").bind('技術', 30).run();

		// テスト用の公開済み相談を作成してタグを紐付ける
		await db.prepare("INSERT INTO consultations (title, body, draft, author_id) VALUES (?, ?, ?, ?)").bind('公開相談1', 'テスト本文1', 0, 1).run();
		await db.prepare("INSERT INTO consultations (title, body, draft, author_id) VALUES (?, ?, ?, ?)").bind('公開相談2', 'テスト本文2', 0, 1).run();
		// 下書きの相談（countに含めないことの検証用）
		await db.prepare("INSERT INTO consultations (title, body, draft, author_id) VALUES (?, ?, ?, ?)").bind('下書き相談', 'テスト本文3', 1, 1).run();

		// consultation_taggings にタグを紐付け
		// 「キャリア」タグ: 公開2件 + 下書き1件 → count=2 であるべき
		await db.prepare("INSERT INTO consultation_taggings (consultation_id, tag_id) VALUES (?, ?)").bind(1, 1).run();
		await db.prepare("INSERT INTO consultation_taggings (consultation_id, tag_id) VALUES (?, ?)").bind(2, 1).run();
		await db.prepare("INSERT INTO consultation_taggings (consultation_id, tag_id) VALUES (?, ?)").bind(3, 1).run();
		// 「人間関係」タグ: 公開1件
		await db.prepare("INSERT INTO consultation_taggings (consultation_id, tag_id) VALUES (?, ?)").bind(1, 2).run();
		// 「技術」タグ: 紐付けなし → count=0
	});

	describe('GET /api/tags', () => {
		it('タグ一覧を取得できる', async () => {
			const req = createApiRequest('/api/tags', 'GET', {
				cookie: sessionCookie!,
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);

			const data = await res.json() as any;
			expect(data).toHaveProperty('data');
			expect(Array.isArray(data.data)).toBe(true);
			expect(data.data.length).toBe(3);
		});

		it('sort_order 昇順で返却される', async () => {
			const req = createApiRequest('/api/tags', 'GET', {
				cookie: sessionCookie!,
			});

			const res = await app.fetch(req, env);
			const data = await res.json() as any;

			expect(data.data[0].name).toBe('キャリア');
			expect(data.data[0].sort_order).toBe(10);
			expect(data.data[1].name).toBe('人間関係');
			expect(data.data[1].sort_order).toBe(20);
			expect(data.data[2].name).toBe('技術');
			expect(data.data[2].sort_order).toBe(30);
		});

		it('count は公開済み相談のみをカウントする', async () => {
			const req = createApiRequest('/api/tags', 'GET', {
				cookie: sessionCookie!,
			});

			const res = await app.fetch(req, env);
			const data = await res.json() as any;

			// 「キャリア」: 公開2件（下書き1件はカウント外）
			const careerTag = data.data.find((t: any) => t.name === 'キャリア');
			expect(careerTag.count).toBe(2);

			// 「人間関係」: 公開1件
			const relationshipTag = data.data.find((t: any) => t.name === '人間関係');
			expect(relationshipTag.count).toBe(1);

			// 「技術」: 紐付けなし
			const techTag = data.data.find((t: any) => t.name === '技術');
			expect(techTag.count).toBe(0);
		});

		it('各タグのレスポンスに必要なフィールドが含まれている', async () => {
			const req = createApiRequest('/api/tags', 'GET', {
				cookie: sessionCookie!,
			});

			const res = await app.fetch(req, env);
			const data = await res.json() as any;

			const tag = data.data[0];
			expect(tag).toHaveProperty('id');
			expect(tag).toHaveProperty('name');
			expect(tag).toHaveProperty('sort_order');
			expect(tag).toHaveProperty('count');
			expect(typeof tag.id).toBe('number');
			expect(typeof tag.name).toBe('string');
			expect(typeof tag.sort_order).toBe('number');
			expect(typeof tag.count).toBe('number');
		});

		it('認証なしでアクセスすると401エラーになる', async () => {
			const req = createApiRequest('/api/tags');

			const res = await app.fetch(req, env);
			expect(res.status).toBe(401);
			const data = await res.json() as any;
			assertUnauthorizedError(data);
		});
	});

	describe('GET /api/tags - タグが存在しない場合', () => {
		let sessionCookieForEmptyTags: string | null = null;

		beforeAll(async () => {
			const db = env.DB;
			// このテストシナリオのために、tags と consultation_taggings テーブルをクリア
			await db.prepare("DELETE FROM tags").run();
			await db.prepare("DELETE FROM consultation_taggings").run();

			// テストユーザーを作成してログイン (既存の beforeAll とは独立して実行するため)
			const user = await createAndLoginUser({
				name: 'Test User for Empty Tags',
				email: `empty-tags-test-${Date.now()}@example.com`,
			});
			sessionCookieForEmptyTags = user.cookie;
			expect(sessionCookieForEmptyTags).toBeTruthy();
		});

		it('タグが存在しない場合に空の配列を返す', async () => {
			const req = createApiRequest('/api/tags', 'GET', {
				cookie: sessionCookieForEmptyTags!,
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);

			const data = await res.json() as any;
			expect(data).toHaveProperty('data');
			expect(Array.isArray(data.data)).toBe(true);
			expect(data.data.length).toBe(0);
		});
	});
});
