import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';

describe('Consultations API - Create (POST /)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let existingTagIds: number[] = [];
  const assertValidationError = (data: any) => {
    expect(data.error).toBe('ValidationError');
    expect(data.message).toBe('入力内容に誤りがあります');
  };

  beforeAll(async () => {
    await setupIntegrationTest();
    user = await createAndLoginUser();

    const tagNameA = `create-test-tag-a-${Date.now()}`;
    const tagNameB = `create-test-tag-b-${Date.now()}`;
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagNameA).run();
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagNameB).run();

    const tagA = await env.DB
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(tagNameA)
      .first() as { id: number } | null;
    const tagB = await env.DB
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(tagNameB)
      .first() as { id: number } | null;

    expect(tagA?.id).toBeDefined();
    expect(tagB?.id).toBeDefined();
    existingTagIds = [tagA!.id, tagB!.id];
  });

  it('相談作成: 新しい相談を作成できる', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '統合テスト相談',
        body: 'これは統合テストで作成された相談です。実際のDBを使用しています。',
        draft: false,
        tagIds: [existingTagIds[0]],
      },
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
    expect(data.author).toHaveProperty('id');
    expect(data.author).toHaveProperty('name');
    expect(data.author).toHaveProperty('disabled');
    expect(data.author).not.toHaveProperty('createdAt');
    expect(data.author).not.toHaveProperty('updatedAt');
    expect(data).toHaveProperty('body');
    expect(data).toHaveProperty('advices');
    expect(Array.isArray(data.advices)).toBe(true);
    expect(data.advices.length).toBe(0);
  });

  it('下書き作成: draft=trueで相談を作成できる', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '下書き相談',
        body: 'これは下書きです。本文を10文字以上にします。',
        draft: true,
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.draft).toBe(true);
  });

  it('下書き作成: draft=true かつ tagIds未指定でも作成できる', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '下書き相談（タグ未指定）',
        body: '下書き保存時はタグ任意の挙動確認です。',
        draft: true,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.draft).toBe(true);
  });

  it('下書き作成: draft=true かつ tagIdsが空配列でも作成できる', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '下書き相談（タグ空配列）',
        body: '下書き保存時にタグ空配列を許容する挙動確認です。',
        draft: true,
        tagIds: [],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.draft).toBe(true);
  });

  it('draftを指定しない場合、デフォルトでfalseになる', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'デフォルト相談',
        body: 'draftを指定していません。',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.draft).toBe(false);
  });

  it('body_previewが100文字に切り出される', async () => {
    const longBody = 'A'.repeat(200);
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '長文テスト',
        body: longBody,
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.body_preview).toBe('A'.repeat(100));
    expect(data.body_preview.length).toBe(100);
    expect(data.body).toBe(longBody);
    expect(data.body.length).toBe(200);
  });

  it('created_atとupdated_atが自動生成される', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'タイムスタンプテスト',
        body: 'created_atとupdated_atの自動生成を確認',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.created_at).toBeDefined();
    expect(data.updated_at).toBeDefined();

    const createdAt = new Date(data.created_at);
    expect(createdAt).toBeInstanceOf(Date);
    expect(createdAt.getTime()).not.toBeNaN();
    expect(Math.abs(Date.now() - createdAt.getTime())).toBeLessThan(5000);
  });

  it('hidden_atとsolved_atがnullで初期化される', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'null初期化テスト',
        body: 'hidden_atとsolved_atがnullで初期化されることを確認',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.hidden_at).toBeNull();
    expect(data.solved_at).toBeNull();
  });

  it('タイトルが空の場合400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '',
        body: '本文はあります',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('本文が10文字未満の場合400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'テスト',
        body: 'short',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('本文が10000文字超の場合400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '本文上限超過テスト',
        body: 'A'.repeat(10001),
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('タイトルが100文字超の場合400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'A'.repeat(101),
        body: 'これはテスト本文です。',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      body: {
        title: 'テスト',
        body: '認証なしテスト',
        tagIds: [existingTagIds[0]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
  });

  it('タグ付き相談作成: tagIdsが空配列の場合は400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'タグなし相談',
        body: 'tagIdsが空配列です。',
        draft: false,
        tagIds: [],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('公開作成: draft=false かつ tagIds未指定の場合は400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '公開相談（タグ未指定）',
        body: '公開時にタグ未指定のバリデーション確認です。',
        draft: false,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('公開作成: tagIdsが4件以上の場合は400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '公開相談（タグ4件）',
        body: '公開時にtagIds上限超過のバリデーション確認です。',
        draft: false,
        tagIds: [existingTagIds[0], existingTagIds[1], existingTagIds[0], existingTagIds[1]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('公開作成: tagIdsに不正なID(0/-1)が含まれる場合は400エラーを返す', async () => {
    const invalidTagIds = [0, -1];

    for (const invalidTagId of invalidTagIds) {
      const req = createApiRequest('/api/consultations', 'POST', {
        cookie: user.cookie,
        body: {
          title: `公開相談（不正tagId:${invalidTagId}）`,
          body: '不正なtagIdsのバリデーション確認です。',
          draft: false,
          tagIds: [invalidTagId],
        },
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      assertValidationError(data);
    }
  });

  it('下書き作成: tagIdsが4件以上の場合は400エラーを返す', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '下書き相談（タグ4件）',
        body: '下書きでもtagIds上限超過のバリデーション確認です。',
        draft: true,
        tagIds: [existingTagIds[0], existingTagIds[1], existingTagIds[0], existingTagIds[1]],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('タグ付き相談作成: 存在するタグIDを複数指定して相談を作成できる', async () => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'タグ付き相談テスト',
        body: 'これは複数のタグが付いた相談です。',
        draft: false,
        tagIds: existingTagIds,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('タグ付き相談テスト');
  });

  it('タグ付き相談作成(失敗): 存在しないタグIDが含まれると409を返し、相談本体は作成されない', async () => {
    const nonExistentTagId = 99999;
    const rollbackTitle = `失敗するタグ付き相談-${Date.now()}`;
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: rollbackTitle,
        body: '存在しないタグIDが含まれています。',
        draft: false,
        tagIds: [...existingTagIds, nonExistentTagId],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(409);

    const error = await res.json() as any;
    expect(error.error).toBe('ConflictError');
    expect(error.message).toContain(`存在しないタグIDが含まれています: ${nonExistentTagId}`);

    const remained = await env.DB
      .prepare('SELECT COUNT(*) as count FROM consultations WHERE title = ?')
      .bind(rollbackTitle)
      .first() as { count: number } | null;
    expect(Number(remained?.count ?? 0)).toBe(0);
  });
});
