import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';

describe('Consultations API - Update (PUT /:id)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
  let consultationId: number;
  let tagId: number;

  beforeAll(async () => {
    await setupIntegrationTest();

    user = await createAndLoginUser();
    attacker = await createAndLoginUser({ name: 'Attacker' });

    const tagName = `update-test-tag-${Date.now()}`;
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagName).run();
    const createdTag = await env.DB
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(tagName)
      .first() as { id: number } | null;
    expect(createdTag?.id).toBeDefined();
    tagId = createdTag!.id;

    const createRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '更新用下書き',
        body: '更新前の本文です。10文字以上あります。',
        draft: true,
        tagIds: [tagId],
      },
    }), env);
    expect(createRes.status).toBe(201);

    const created = await createRes.json() as any;
    consultationId = created.id;
  });

  it('更新用の下書き相談が作成されている', () => {
    expect(consultationId).toBeDefined();
  });

  it('下書き状態の相談を再度下書き更新できる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}`, 'PUT', {
      cookie: user.cookie,
      body: {
        title: '下書き更新後タイトル',
        body: '下書き更新後の本文です。10文字以上あります。',
        draft: true,
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.id).toBe(consultationId);
    expect(data.draft).toBe(true);
    expect(data.updated_at).toBeDefined();
    expect(data).not.toHaveProperty('title');
    expect(data).not.toHaveProperty('body');
    expect(data).not.toHaveProperty('author');
  });

  it('下書き状態から公開状態に変更できる', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}`, 'PUT', {
      cookie: user.cookie,
      body: {
        title: '公開タイトル',
        body: '公開用の本文です。10文字以上あります。',
        draft: false,
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.id).toBe(consultationId);
    expect(data.draft).toBe(false);
  });

  it('draft未指定で更新した場合、false（公開）として扱われる', async () => {
    const createRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'draft省略更新用',
        body: 'draft省略時の挙動を確認するための本文です。',
        draft: true,
        tagIds: [tagId],
      },
    }), env);
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;

    const req = createApiRequest(`/api/consultations/${created.id}`, 'PUT', {
      cookie: user.cookie,
      body: {
        title: 'draft省略更新後タイトル',
        body: 'draft省略更新後の本文です。10文字以上あります。',
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.id).toBe(created.id);
    expect(data.draft).toBe(false);
    expect(data.updated_at).toBeDefined();
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}`, 'PUT', {
      body: {
        title: '未認証更新',
        body: '認証なしで更新を試みる本文です。',
        draft: true,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
  });

  it('不正なID(0/-1/abc)を指定した場合400エラーを返す', async () => {
    const invalidIds = ['0', '-1', 'abc'];

    for (const invalidId of invalidIds) {
      const req = createApiRequest(`/api/consultations/${invalidId}`, 'PUT', {
        cookie: user.cookie,
        body: {
          title: '不正ID更新',
          body: '不正なIDで更新を試みる本文です。',
          draft: true,
        },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('入力内容に誤りがあります');
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('draft');
    }
  });

  it('タイトル/本文のバリデーション違反で400エラーを返す', async () => {
    const invalidCases = [
      { title: '', body: 'タイトルが空のときの本文です。', draft: true },
      { title: '本文短すぎ', body: 'short', draft: true },
      { title: 'A'.repeat(101), body: 'タイトルが長すぎるときの本文です。', draft: true },
    ];

    for (const payload of invalidCases) {
      const req = createApiRequest(`/api/consultations/${consultationId}`, 'PUT', {
        cookie: user.cookie,
        body: payload,
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('入力内容に誤りがあります');
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('draft');
    }
  });

  it('【403 Forbidden】他人の相談データは更新できない', async () => {
    const req = createApiRequest(`/api/consultations/${consultationId}`, 'PUT', {
      cookie: attacker.cookie,
      body: {
        title: '乗っ取りタイトル',
        body: '他人のデータを書き換えようとしています',
        draft: true,
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.error).toBe('ForbiddenError');
    expect(body.message).toBe('相談の所有者ではないため、更新できません。');
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('draft');
  });

  it('【404 Not Found】存在しないIDを更新しようとするとエラーになる', async () => {
    const nonExistentId = 999999;

    const req = createApiRequest(`/api/consultations/${nonExistentId}`, 'PUT', {
      cookie: user.cookie,
      body: {
        title: '更新不可',
        body: '本文は10文字以上必要です。',
        draft: true,
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe('NotFoundError');
    expect(body.message).toBe(`相談が見つかりません: id=${nonExistentId}`);
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('draft');
  });
});
