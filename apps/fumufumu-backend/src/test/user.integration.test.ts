import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';
import { setupIntegrationTest } from './helpers/db-helper';
import { createAndLoginUser } from './helpers/auth-helper';
import { createApiRequest } from './helpers/request-helper';
import { assertUnauthorizedError } from './helpers/assert-helper';

describe('Consultations API Integration Tests', () => {
    let sessionCookie: string | null = null;

    // テスト実行前のセットアップ
    beforeAll(async () => {
        await setupIntegrationTest();

        // テストユーザーを作成してログイン
        const user = await createAndLoginUser({
            name: 'Test User for Consultations',
            email: 'consultation-test@example.com',
        });
        sessionCookie = user.cookie;
        expect(sessionCookie).toBeTruthy();

        // User B（攻撃者）を作成（別セッションCookie取得）
        await createAndLoginUser({
            name: 'Attacker',
            email: `attacker-${Date.now()}@example.com`,
        });
    });

    describe('POST /api/users/me', () => {
        it('ユーザー取得', async () => {
            const req = createApiRequest('/api/users/me', 'GET', {
                cookie: sessionCookie!,
            });

            const res = await app.fetch(req, env);
            expect(res.status).toBe(200);

            const data = await res.json() as any;
            expect(data.name).equal('Test User for Consultations');
            expect(data.disabled).equal(false);
            expect(data).toHaveProperty('createdAt');
            expect(data).toHaveProperty('updatedAt');
        });


        it('404 Not Found', async () => {
            const req = createApiRequest('/api/users/1234567890', 'GET', {
                cookie: sessionCookie!,
            });

            const res = await app.fetch(req, env);
            expect(res.status).toBe(404);
        });

        it('401 Unauthorized', async () => {
            const req = createApiRequest('/api/users/me');

            const res = await app.fetch(req, env);
            expect(res.status).toBe(401);
            const data = await res.json() as any;
            assertUnauthorizedError(data);
        });
    });
});
