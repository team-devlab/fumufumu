import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../index';
import { setupIntegrationTest, forceSetDisabled } from './helpers/db-helper';
import { createAndLoginUser } from './helpers/auth-helper';
import { createApiRequest } from './helpers/request-helper';

/**
 * authGuard middleware の無効化(disabled)enforce を検証する (#136)。
 *
 * - disabled=true のユーザーは、有効なセッションを持っていても認証必須 API で 403 を受け取る。
 *   admin API の 404 化(存在秘匿, ADR 010 §4)とは別概念で、本人に「無効化されている」ことを
 *   明確に伝えるため 403 + code:'account_disabled' を返す。
 * - 毎リクエスト DB を引くため、BAN 後の次リクエストで即時に遮断されることを担保する
 *   (セッション作成時点では有効 → 途中で disabled にした後に 403 へ変わる)。
 * - 未認証の 401 は既存テストでカバー済みのため本ファイルでは扱わない。
 */
describe('authGuard disabled enforcement', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  it('disabled=true のユーザーは認証必須 API で 403(account_disabled) を受け取る', async () => {
    const user = await createAndLoginUser();
    await forceSetDisabled(user.appUserId);

    const req = createApiRequest('/api/protected', 'GET', { cookie: user.cookie });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(403);

    const data = await res.json() as { error: string; code: string; message: string };
    expect(data.code).toBe('account_disabled');
    expect(data.error).toBe('Account disabled');
  });

  it('disabled=false の通常ユーザーは従来通り 200 で通過できる(過剰遮断しない)', async () => {
    const user = await createAndLoginUser();

    const req = createApiRequest('/api/protected', 'GET', { cookie: user.cookie });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
  });

  it('有効だったセッションでも、途中で disabled にすると次リクエストから 403 になる(即時遮断)', async () => {
    const user = await createAndLoginUser();

    // BAN 前: 通過できる
    const before = await app.fetch(
      createApiRequest('/api/protected', 'GET', { cookie: user.cookie }),
      env,
    );
    expect(before.status).toBe(200);

    // 同一セッションのまま DB 側で BAN
    await forceSetDisabled(user.appUserId);

    // BAN 後: 同じ Cookie でも 403
    const after = await app.fetch(
      createApiRequest('/api/protected', 'GET', { cookie: user.cookie }),
      env,
    );
    expect(after.status).toBe(403);
  });
});
