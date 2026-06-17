import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../index';
import { setupIntegrationTest } from './helpers/db-helper';
import { createAndLoginUser } from './helpers/auth-helper';
import { createApiRequest } from './helpers/request-helper';

/**
 * adminGuard middleware の認可挙動を /api/admin/content-check 経由で検証する。
 *
 * ADR 010 §4:
 *  - 認証済み非 admin は 404（403 ではない）を受け取る
 *    → admin API の存在自体を露出させない
 *  - 未認証は authGuard が先に 401 を返す（adminGuard まで到達しない）
 *    → 既存の content-check テストでカバー済みのため本ファイルでは扱わない
 */
describe('adminGuard middleware', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  it('認証済みでも role=user の場合は admin API に 404 を返す', async () => {
    const regularUser = await createAndLoginUser();

    const req = createApiRequest('/api/admin/content-check/consultations', 'GET', {
      cookie: regularUser.cookie,
      queryParams: { view: 'summary' },
    });

    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);

    const data = await res.json() as { error: string };
    expect(data.error).toBe('Not Found');
  });

  it('role=admin は admin API を 200 で通過できる', async () => {
    const adminUser = await createAndLoginUser({ role: 'admin' });

    const req = createApiRequest('/api/admin/content-check/consultations', 'GET', {
      cookie: adminUser.cookie,
      queryParams: { view: 'summary' },
    });

    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
  });

  it('POST 系 admin endpoint も非 admin は 404 を返す (method を問わず gate される)', async () => {
    // GET だけテストすると「app.use('/*', ...) で本当に POST も拾えているか」が担保できないため、
    // method 横断で gate が効くことを確認する。
    const regularUser = await createAndLoginUser();

    const req = createApiRequest('/api/admin/content-check/consultations/1/decision', 'POST', {
      cookie: regularUser.cookie,
      body: { decision: 'approved' },
    });

    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);

    const data = await res.json() as { error: string };
    expect(data.error).toBe('Not Found');
  });
});
