import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError, assertValidationError } from '../helpers/assert-helper';

describe('Consultations API - Advice Draft Update (PUT /:id/advice/draft)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
  let consultationId: number;
  let tagId: number;

  beforeAll(async () => {
    await setupIntegrationTest();

    user = await createAndLoginUser();
    attacker = await createAndLoginUser({ name: 'Attacker' });

    const tagName = `advice-draft-test-tag-${Date.now()}`;
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
        title: 'テスト相談',
        body: 'テスト本文です。10文字以上あります。',
        draft: false,
        tagIds: [tagId],
      },
    }), env);
    expect(consultationRes.status).toBe(201);

    const consultation = await consultationRes.json() as any;
    consultationId = consultation.id;

    const adviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultationId}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: '相談回答本文です。10文字以上あります。',
        draft: true,
      },
    }), env);
    expect(adviceRes.status).toBe(201);
  });

  it('下書きの相談回答を更新できる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice/draft`, 'PUT', {
      cookie: user.cookie,
      body: {
        body: '更新後の相談回答本文です。10文字以上あります。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('draft', true);
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('created_at');
    expect(data).not.toHaveProperty('body');
    expect(data).not.toHaveProperty('author');
  });

  it('存在しない（またはリクエストユーザーに紐づかない）下書き回答を更新しようとするとエラーになる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice/draft`, 'PUT', {
      cookie: attacker.cookie,
      body: {
        body: '更新後の相談回答本文です。10文字以上あります。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');
    expect(body).toHaveProperty('message');
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice/draft`, 'PUT', {
      body: {
        body: '認証なしで下書き回答更新を試みる本文です。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    assertUnauthorizedError(body);
  });

  it('不正なID(0/-1/abc)を指定した場合400エラーを返す', async () => {
    const invalidIds = ['0', '-1', 'abc'];

    for (const invalidId of invalidIds) {
      const req = createApiRequest(`/api/consultations/${invalidId}/advice/draft`, 'PUT', {
        cookie: user.cookie,
        body: {
          body: '不正IDで下書き回答更新を試みる本文です。',
        },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      assertValidationError(body, '入力内容に誤りがあります');
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('draft');
    }
  });

  it('本文が短すぎる場合（10文字未満）は400エラーになる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}/advice/draft`, 'PUT', {
      cookie: user.cookie,
      body: {
        body: 'short',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    assertValidationError(body, '入力内容に誤りがあります');
  });

  it('公開済み回答は下書き更新できない', async () => {
    const consultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '公開回答更新不可テスト相談',
        body: '公開回答更新不可の挙動確認用本文です。',
        draft: false,
        tagIds: [tagId],
      },
    }), env);
    expect(consultationRes.status).toBe(201);
    const consultation = await consultationRes.json() as any;

    const adviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}/advice`, 'POST', {
      cookie: user.cookie,
      body: {
        body: 'これは公開済み回答です。10文字以上あります。',
        draft: false,
      },
    }), env);
    expect(adviceRes.status).toBe(201);

    const updateReq = createApiRequest(`/api/consultations/${consultation.id}/advice/draft`, 'PUT', {
      cookie: user.cookie,
      body: {
        body: '公開回答を下書き更新しようとする本文です。',
      },
    });
    const updateRes = await app.fetch(updateReq, env);

    expect(updateRes.status).toBe(404);
    const body = await updateRes.json() as any;
    expect(body.error).toBe('NotFoundError');
    expect(body.message).toBe('相談回答は公開されているため、更新できません。');
  });
});
