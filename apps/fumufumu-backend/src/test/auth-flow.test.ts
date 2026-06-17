import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';
import { setupIntegrationTest } from './helpers/db-helper';
import { createAndLoginUser } from './helpers/auth-helper';
import { createApiRequest } from './helpers/request-helper';
import { assertUnauthorizedError } from './helpers/assert-helper';

describe('Integration Tests', () => {
	// テスト実行前のDBセットアップ
	beforeAll(async () => {
		await setupIntegrationTest();
	});

	// Health Check APIテスト
	describe('GET /health', () => {
		it('should return 200 OK and confirm DB connection', async () => {
			const req = createApiRequest('/health');
			const res = await app.fetch(req, env);

			expect(res.status).toBe(200);
			const body = await res.json() as any;
			expect(body.status).toBe('ok');
			expect(body.database).toBe('connected');
		});
	});

	// 認証と保護ルートのシナリオテスト
	describe('Auth & Protected Routes Flow', () => {
		const testUser = {
			name: 'Integration Test User',
			email: `test-${Date.now()}@example.com`,
			password: 'password123456',
		};

		// 認証なしでのアクセス確認（これはDB状態に依存しないので独立していてOK）
		it('should deny access to protected route without cookie', async () => {
			const req = createApiRequest('/api/protected');
			const res = await app.fetch(req, env);
			expect(res.status).toBe(401);
			const body = await res.json() as any;
			assertUnauthorizedError(body);
		});

		// データの依存関係があるテストを一連の流れ（シナリオ）としてまとめる
		it('should handle full auth flow: Signup -> Access -> Signin', async () => {
			// --- Step 1: Sign Up ---
			console.log('Step 1: Signing up...');
			const user = await createAndLoginUser({
				name: testUser.name,
				email: testUser.email,
			});
			expect(user.authUserId).toBeTruthy();
			expect(user.cookie).toBeTruthy();


			// --- Step 2: Access Protected Route (With Cookie) ---
			// ※同じテストケース内なのでDBの状態（ユーザー・セッション）は維持されています
			console.log('Step 2: Accessing protected route...');
			const protectedReq = createApiRequest('/api/protected', 'GET', {
				cookie: user.cookie,
			});
			const protectedRes = await app.fetch(protectedReq, env);

			if (protectedRes.status !== 200) {
				const err = await protectedRes.json();
				console.error('Protected route error details:', err);
			}
			expect(protectedRes.status).toBe(200);
			const protectedBody = await protectedRes.json() as any;
			expect(protectedBody.message).toContain('Welcome');
			expect(protectedBody.userName).toBe(testUser.name);


			// --- Step 3: Sign In (Explicitly) ---
			// ※同じDBを使っているのでユーザーが存在し、ログインできるはず
			console.log('Step 3: Signing in explicitly...');
			const signinReq = createApiRequest('/api/auth/signin', 'POST', {
				body: {
					email: testUser.email,
					password: testUser.password
				},
			});
			const signinRes = await app.fetch(signinReq, env);
			expect(signinRes.status).toBe(200);

			const newCookie = signinRes.headers.get('set-cookie');
			expect(newCookie).toBeTruthy();
		});

		it('should sign out and reject old session cookie', async () => {
			const user = await createAndLoginUser({
				name: `Signout Test User ${Date.now()}`,
				email: `signout-test-${Date.now()}@example.com`,
			});

			const signoutReq = createApiRequest('/api/auth/signout', 'POST', {
				cookie: user.cookie,
			});
			const signoutRes = await app.fetch(signoutReq, env);

			expect(signoutRes.status).toBe(200);
			const setCookie = signoutRes.headers.get('set-cookie');
			expect(setCookie).toBeTruthy();

			const protectedReq = createApiRequest('/api/protected', 'GET', {
				cookie: user.cookie,
			});
			const protectedRes = await app.fetch(protectedReq, env);

			expect(protectedRes.status).toBe(401);
			const body = await protectedRes.json() as any;
			assertUnauthorizedError(body);
		});

		it('should lazily re-provision the business layer when the mapping is missing (issue #115)', async () => {
			const user = await createAndLoginUser({
				name: `Lazy Provision User ${Date.now()}`,
				email: `lazy-provision-${Date.now()}@example.com`,
			});

			// 「セッションは有効だが業務層 (users / auth_mappings) が無い」状態を再現する。
			// Google OAuth 経路や signup 途中失敗で起こりうるケース。
			await env.DB.prepare('DELETE FROM auth_mappings WHERE auth_user_id = ?')
				.bind(user.authUserId)
				.run();
			await env.DB.prepare('DELETE FROM users WHERE id = ?')
				.bind(user.appUserId)
				.run();

			// 保護ルートへのアクセス時に authGuard が lazy provisioning で業務層を再生成する
			const firstRes = await app.fetch(
				createApiRequest('/api/protected', 'GET', { cookie: user.cookie }),
				env,
			);
			expect(firstRes.status).toBe(200);
			const firstBody = await firstRes.json() as any;
			expect(firstBody.appUserId).toBeTruthy();
			expect(firstBody.userName).toBe(user.name);

			// 冪等性: 再アクセスしても同じ appUserId が返り、二重生成されない
			const secondRes = await app.fetch(
				createApiRequest('/api/protected', 'GET', { cookie: user.cookie }),
				env,
			);
			expect(secondRes.status).toBe(200);
			const secondBody = await secondRes.json() as any;
			expect(secondBody.appUserId).toBe(firstBody.appUserId);
		});

		it('should return a client auth error instead of 500 when the user does not exist', async () => {
			const signinReq = createApiRequest('/api/auth/signin', 'POST', {
				body: {
					email: `missing-${Date.now()}@example.com`,
					password: testUser.password,
				},
			});
			const signinRes = await app.fetch(signinReq, env);

			expect(signinRes.ok).toBe(false);
			expect(signinRes.status).toBeGreaterThanOrEqual(400);
			expect(signinRes.status).toBeLessThan(500);
			expect(signinRes.headers.get('set-cookie')).toBeFalsy();

			const signinBody = await signinRes.json() as any;
			expect(signinBody.auth_user_id).toBeUndefined();
		});
	});
});
