import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';

// DBの型定義
interface CloudflareBindings {
	DB: D1Database;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
}

// マイグレーション型定義
interface D1Migration {
	name: string;
	queries: string[];
}

// Vite の import.meta.glob 型定義を追加
declare global {
	interface ImportMeta {
		glob<T = any>(
			pattern: string | string[],
			options?: {
				eager?: boolean;
				import?: string;
				query?: string;
				as?: string;
			}
		): Record<string, T>;
	}
}

// マイグレーションヘルパー
function getMigrations(): D1Migration[] {
	const journalGlobs = import.meta.glob('../../drizzle/meta/_journal.json', { eager: true });
	const journalPath = Object.keys(journalGlobs)[0];
	const journal = journalGlobs[journalPath] as { entries: { tag: string }[] };

	if (!journal) {
		throw new Error('Migration journal not found');
	}

	const sqlGlobs = import.meta.glob('../../drizzle/*.sql', {
		eager: true,
		query: '?raw',
		import: 'default'
	});

	return journal.entries.map((entry) => {
		const sqlKey = `../../drizzle/${entry.tag}.sql`;
		const sqlContent = sqlGlobs[sqlKey] as string;

		if (!sqlContent) {
			throw new Error(`Migration file not found for: ${entry.tag}`);
		}

		const queries = sqlContent
			.split('--> statement-breakpoint')
			.map((q) => q.trim())
			.filter((q) => q.length > 0);

		return {
			name: entry.tag,
			queries: queries,
		};
	});
}

describe('Consultations API Integration Tests', () => {
	let sessionCookie: string | null = null;
	let attackerCookie: string | null = null;
	let existingTagIds: number[] = [];

	// テスト実行前のセットアップ
	beforeAll(async () => {
		// マイグレーション実行
		const migrations = getMigrations();
		await applyD1Migrations((env as unknown as CloudflareBindings).DB, migrations);

		// テストユーザーを作成してログイン
		const testUser = {
			name: 'Test User for Consultations',
			email: `consultation-test-${Date.now()}@example.com`,
			password: 'password123456',
		};

		const signupReq = new Request('http://localhost/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(testUser),
		});

		const signupRes = await app.fetch(signupReq, env);
		expect(signupRes.status).toBe(200);

		sessionCookie = signupRes.headers.get('set-cookie');
		expect(sessionCookie).toBeTruthy();
		// Set-Cookie は属性付きで返ることがあるので "key=value" だけ抜き出す
		const setCookieA = signupRes.headers.get('set-cookie');
		expect(setCookieA).toBeTruthy();
		sessionCookie = (setCookieA as string).split(';')[0];

		// User B（攻撃者）を作成（別セッションCookie取得）
		const attacker = {
			name: 'Attacker',
			email: `attacker-${Date.now()}@example.com`,
			password: 'password123456',
		};

		const attackerSignupReq = new Request('http://localhost/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(attacker),
		});

		const attackerSignupRes = await app.fetch(attackerSignupReq, env);
		expect(attackerSignupRes.status).toBe(200);

		const setCookieB = attackerSignupRes.headers.get('set-cookie');
		expect(setCookieB).toBeTruthy();
		attackerCookie = (setCookieB as string).split(';')[0];

		// テスト用のタグをDBに直接挿入
		const db = (env as unknown as CloudflareBindings).DB;
		await db.prepare("INSERT INTO tags (name) VALUES (?)").bind('TagForTest1').run();
		await db.prepare("INSERT INTO tags (name) VALUES (?)").bind('TagForTest2').run();

        const tags = await db.prepare("SELECT id FROM tags WHERE name LIKE 'TagForTest%'").all();
        // @ts-ignore
        existingTagIds = tags.results.map(r => r.id);
        expect(existingTagIds.length).toBe(2);
	});

	describe('POST /api/consultations', () => {
		it('相談作成: 新しい相談を作成できる', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: '統合テスト相談',
						body: 'これは統合テストで作成された相談です。実際のDBを使用しています。',
						draft: false,
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data).toHaveProperty('id');
			expect(data.title).toBe('統合テスト相談');
			expect(data.draft).toBe(false);
			expect(data).toHaveProperty('created_at');
			expect(data).toHaveProperty('updated_at');
			expect(data).toHaveProperty('author');
			expect(data.author).toHaveProperty('name');
			expect(data).toHaveProperty('body');
			expect(data).toHaveProperty('advices');
		});

		it('下書き作成: draft=trueで相談を作成できる', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: '下書き相談',
						body: 'これは下書きです。本文を10文字以上にします。',
						draft: true,
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);

			// エラー時はレスポンスボディを出力
			if (res.status !== 201) {
				const error = await res.json();
				console.error('Error response:', error);
			}

			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data.draft).toBe(true);
		});

		it('draftを指定しない場合、デフォルトでfalseになる', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: 'デフォルト相談',
						body: 'draftを指定していません。',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data.draft).toBe(false);
		});

		it('body_previewが100文字に切り出される', async () => {
			const longBody = 'A'.repeat(200);
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: '長文テスト',
						body: longBody,
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data.body_preview).toBe('A'.repeat(100));
			expect(data.body_preview.length).toBe(100);

			// NOTE: 全文(body)は切り取られずに200文字入っていること
			expect(data.body).toBe(longBody);
			expect(data.body.length).toBe(200);
		});

		it('created_atとupdated_atが自動生成される', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: 'タイムスタンプテスト',
						body: 'created_atとupdated_atの自動生成を確認',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data.created_at).toBeDefined();
			expect(data.updated_at).toBeDefined();

			// 有効な日付フォーマットか確認
			const createdAt = new Date(data.created_at);
			expect(createdAt).toBeInstanceOf(Date);
			expect(createdAt.getTime()).not.toBeNaN();

			// 現在時刻に近いか確認（5秒以内）
			const now = Date.now();
			const createdTime = createdAt.getTime();
			expect(Math.abs(now - createdTime)).toBeLessThan(5000);
		});

		it('hidden_atとsolved_atがnullで初期化される', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: 'null初期化テスト',
						body: 'hidden_atとsolved_atがnullで初期化されることを確認',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data.hidden_at).toBeNull();
			expect(data.solved_at).toBeNull();
		});

		it('タイトルが空の場合400エラーを返す', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: '',
						body: '本文はあります',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(400);
		});

		it('本文が10文字未満の場合400エラーを返す', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: 'テスト',
						body: 'short',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(400);
		});

		it('タイトルが100文字超の場合400エラーを返す', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: 'A'.repeat(101),
						body: 'これはテスト本文です。',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(400);
		});

		it('認証なしの場合401エラーを返す', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// Cookieなし
				},
					body: JSON.stringify({
						title: 'テスト',
						body: '認証なしテスト',
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(401);
		});

		it('タグ付き相談作成: tagIdsが空配列の場合は400エラーを返す', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					title: 'タグなし相談',
					body: 'tagIdsが空配列です。',
					draft: false,
					tagIds: [],
				}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(400);
		});

		it('タグ付き相談作成: 存在するタグIDを複数指定して相談を作成できる', async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					title: 'タグ付き相談テスト',
					body: 'これは複数のタグが付いた相談です。',
					draft: false,
					tagIds: existingTagIds, // 事前に作成したタグID
				}),
			});

			const res = await app.fetch(req, env);
			// レスポンスボディを詳細に出力
			if (res.status !== 201) {
				const error = await res.json();
				console.error('Error creating consultation with tags:', error);
			}
			expect(res.status).toBe(201);

			const data = await res.json() as any;
			expect(data).toHaveProperty('id');
			expect(data.title).toBe('タグ付き相談テスト');
		});

		it('タグ付き相談作成(失敗): 存在しないタグIDが含まれると409を返し、相談本体もロールバックされる', async () => {
			const nonExistentTagId = 99999;
			const tagIds = [...existingTagIds, nonExistentTagId];
			const rollbackTitle = `失敗するタグ付き相談-${Date.now()}`;
			const db = (env as unknown as CloudflareBindings).DB;

			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					title: rollbackTitle,
					body: '存在しないタグIDが含まれています。',
					draft: false,
					tagIds: tagIds,
				}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(409); // ConflictError

			const error = await res.json() as any;
			expect(error.error).toBe('ConflictError');
			expect(error.message).toContain(`存在しないタグIDが含まれています: ${nonExistentTagId}`);

			const remained = await db
				.prepare("SELECT id FROM consultations WHERE title = ?")
				.bind(rollbackTitle)
				.all();
			// @ts-ignore
			expect(remained.results.length).toBe(0);
		});
	});

	describe('POST /api/consultations/:id/advice', () => {
		let consultationId: number;

		beforeAll(async () => {
			const req = new Request('http://localhost/api/consultations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
					body: JSON.stringify({
						title: 'テスト相談',
						body: 'テスト本文です。10文字以上あります。',
						draft: false,
						tagIds: [existingTagIds[0]],
					}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);
			const data = await res.json() as any;
			consultationId = data.id;
		})

		it('相談回答を作成できる', async () => {
			const req = new Request(`http://localhost/api/consultations/${consultationId}/advice`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					body: '相談回答本文です。10文字以上あります。',
				}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);
			const data = await res.json() as any;
			expect(data.body).toBe('相談回答本文です。10文字以上あります。');
		});

		it('回答投稿後、親の相談詳細を取得すると回答が含まれている', async () => {
			// まず回答を投稿する
            const postReq = new Request(`http://localhost/api/consultations/${consultationId}/advice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': sessionCookie!,
                },
                body: JSON.stringify({
                    body: 'テスト用回答：詳細画面での表示確認',
                }),
            });
            const postRes = await app.fetch(postReq, env);
            expect(postRes.status).toBe(201);

			// 親の相談IDを使ってGETリクエスト
			const req = new Request(`http://localhost/api/consultations/${consultationId}`, {
				headers: {
					'Cookie': sessionCookie!,
				},
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(200);

			const data = await res.json() as any;

			// advices配列にデータが入っているか確認
            expect(data).toHaveProperty('advices');
            expect(Array.isArray(data.advices)).toBe(true);
            expect(data.advices.length).toBeGreaterThan(0);
            
            // 投稿した内容が含まれているか確認
            expect(data.advices.some((a: any) => a.body === 'テスト用回答：詳細画面での表示確認')).toBe(true);
		});

		it('下書き回答は公開できない', async () => {
			const req = new Request(`http://localhost/api/consultations/${consultationId}/advice`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					body: '下書き回答本文です。10文字以上あります。',
					draft: true,
				}),
			});
			const res = await app.fetch(req, env);
			expect(res.status).toBe(201);
			const data = await res.json() as any;
			expect(data.draft).toBe(true);
		});

		it('本文が短すぎる場合（10文字未満）はバリデーションエラー(400)になる', async () => {
			const req = new Request(`http://localhost/api/consultations/${consultationId}/advice`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					body: '123456789', // 10文字未満
					draft: false,
				}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(400);
		});

		it('存在しない相談IDを指定すると404エラーになる', async () => {
			const nonExistentId = 99999; // 存在しないID
			const req = new Request(`http://localhost/api/consultations/${nonExistentId}/advice`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': sessionCookie!,
				},
				body: JSON.stringify({
					body: 'これは存在しない相談への回答です。10文字以上あります。',
					draft: false,
				}),
			});

			const res = await app.fetch(req, env);
			expect(res.status).toBe(404);

			const data = await res.json() as any;
			expect(data.error).toBe('NotFoundError');
		});
	});

});
