import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';

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
});
