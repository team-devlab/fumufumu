import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest, forceSetHidden } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError } from '../helpers/assert-helper';

describe('Consultations API - Advice Create (POST /:id/advice)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let consultationId: number;
  let tagId: number;

  beforeAll(async () => {
    await setupIntegrationTest();

    user = await createAndLoginUser();

    const tagName = `advice-create-test-tag-${Date.now()}`;
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagName).run();
    const createdTag = await env.DB
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(tagName)
      .first() as { id: number } | null;
    expect(createdTag?.id).toBeDefined();
    tagId = createdTag!.id;

    const createConsultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'テスト相談',
        body: 'テスト本文です。10文字以上あります。',
        draft: false,
        tagIds: [tagId],
      },
    }), env);
    expect(createConsultationRes.status).toBe(201);

    const created = await createConsultationRes.json() as any;
    consultationId = created.id;
  });

  it('相談回答を作成できる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: '相談回答本文です。10文字以上あります。',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.body).toBe('相談回答本文です。10文字以上あります。');
    expect(data.draft).toBe(false);
  });

  it('回答投稿後、親の相談詳細を取得すると回答が含まれている', async () => {
    const postReq = createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: 'テスト用回答：詳細画面での表示確認',
      },
    });
    const postRes = await app.fetch(postReq, env);
    expect(postRes.status).toBe(201);

    const getReq = createApiRequest(`/api/consultations/${consultationId}`, 'GET', {
      cookie: user.cookie,
    });
    const getRes = await app.fetch(getReq, env);
    expect(getRes.status).toBe(200);

    const data = await getRes.json() as any;
    expect(data).toHaveProperty('advices');
    expect(Array.isArray(data.advices)).toBe(true);
    expect(data.advices.length).toBeGreaterThan(0);
    expect(data.advices.some((a: any) => a.body === 'テスト用回答：詳細画面での表示確認')).toBe(true);
  });

  it('draft=trueを指定して下書き回答を作成できる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: '下書き回答本文です。10文字以上あります。',
        draft: true,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.draft).toBe(true);
  });

  it('draft未指定の場合、false（公開）として作成される', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: 'draft未指定で作成する回答本文です。10文字以上あります。',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.draft).toBe(false);
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      body: {
        body: '認証なしで回答作成を試みる本文です。10文字以上あります。',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    assertUnauthorizedError(data);
  });

  it('不正なID(0/-1/abc)を指定した場合400エラーを返す', async () => {
    const invalidIds = ['0', '-1', 'abc'];

    for (const invalidId of invalidIds) {
      const req = createApiRequest(`/api/consultations/${invalidId}/advice`, 'POST', {
        cookie: user.cookie,
        body: {
          body: '不正なIDで回答作成を試みる本文です。10文字以上あります。',
          draft: false,
        },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe('ValidationError');
      expect(data.message).toBe('入力内容に誤りがあります');
      expect(data).not.toHaveProperty('id');
      expect(data).not.toHaveProperty('draft');
    }
  });

  it('本文が短すぎる場合（10文字未満）はバリデーションエラー(400)になる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: '123456789',
        draft: false,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('ValidationError');
    expect(data.message).toBe('入力内容に誤りがあります');
  });

  it('存在しない相談IDを指定すると404エラーになる', async () => {
    const nonExistentId = 99999;
    const req = createApiRequest(`/api/consultations/${nonExistentId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: 'これは存在しない相談への回答です。10文字以上あります。',
        draft: false,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);
    const data = await res.json() as any;
    expect(data.error).toBe('NotFoundError');
  });

  it('hidden状態の相談に回答投稿すると404になり、回答レコードも作成されない', async () => {
    const createConsultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'hidden相談',
        body: 'hidden相談への回答作成可否を検証する本文です。',
        draft: false,
        tagIds: [tagId],
      },
    }), env);
    expect(createConsultationRes.status).toBe(201);
    const createdConsultation = await createConsultationRes.json() as any;
    const hiddenConsultationId = createdConsultation.id;

    await forceSetHidden(hiddenConsultationId);

    const beforeCountRow = await env.DB
      .prepare('SELECT COUNT(*) AS count FROM advices WHERE consultation_id = ?')
      .bind(hiddenConsultationId)
      .first() as { count: number } | null;
    const beforeCount = Number(beforeCountRow?.count ?? 0);

    const req = createApiRequest(`/api/consultations/${hiddenConsultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: 'hidden相談へ回答投稿を試みる本文です。10文字以上あります。',
        draft: false,
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);
    const data = await res.json() as any;
    expect(data.error).toBe('NotFoundError');

    const afterCountRow = await env.DB
      .prepare('SELECT COUNT(*) AS count FROM advices WHERE consultation_id = ?')
      .bind(hiddenConsultationId)
      .first() as { count: number } | null;
    const afterCount = Number(afterCountRow?.count ?? 0);
    expect(afterCount).toBe(beforeCount);
  });
});
