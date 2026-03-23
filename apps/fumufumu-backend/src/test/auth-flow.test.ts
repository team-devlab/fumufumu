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
	});
});
