import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError, assertValidationError } from '../helpers/assert-helper';

describe('Advices API - Advice Draft Update (PUT /advices/:id/draft)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
  let consultationId: number;
  let draftAdviceId: number;
  let publishedAdviceId: number;
  let tagId: number;
  const approveConsultation = async (id: number) => {
    await env.DB
      .prepare("UPDATE content_checks SET status = 'approved', checked_at = (cast(unixepoch('subsecond') * 1000 as integer)), updated_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE target_type = 'consultation' AND target_id = ?")
      .bind(id)
      .run();
  };
  const postAdvice = async (cid: number, body: string, draft: boolean, cookie: string) => {
    const res = await app.fetch(createApiRequest(`/api/consultations/${cid}/advice`, 'POST', {
      cookie,
      body: { body, draft },
    }), env);
    expect(res.status).toBe(201);
    return (await res.json() as { id: number }).id;
  };

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
    await approveConsultation(consultationId);

    // 同一相談・同一ユーザーに「公開済み」と「下書き」を併存させる。
    // consultationId では下書きを一意に特定できない状況を再現する(本修正の核心)。
    publishedAdviceId = await postAdvice(consultationId, '公開済みの相談回答本文です。10文字以上あります。', false, user.cookie);
    draftAdviceId = await postAdvice(consultationId, '下書きの相談回答本文です。10文字以上あります。', true, user.cookie);
  });

  it('公開済みが併存していても、id 指定で下書きだけを更新できる', async () => {
    const req = createApiRequest(`/api/advices/${draftAdviceId}/draft`, 'PUT', {
      cookie: user.cookie,
      body: {
        body: '更新後の相談回答本文です。10文字以上あります。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty('id', draftAdviceId);
    expect(data).toHaveProperty('draft', true);
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('created_at');
    expect(data).not.toHaveProperty('body');
    expect(data).not.toHaveProperty('author');

    // 併存する公開済みアドバイスは書き換わっていないこと
    const published = await env.DB
      .prepare('SELECT body, draft FROM advices WHERE id = ?')
      .bind(publishedAdviceId)
      .first() as { body: string; draft: number } | null;
    expect(published?.draft).toBe(0);
    expect(published?.body).toBe('公開済みの相談回答本文です。10文字以上あります。');
  });

  it('他人の下書きアドバイスは更新できない(404, IDOR fail-closed)', async () => {
    const req = createApiRequest(`/api/advices/${draftAdviceId}/draft`, 'PUT', {
      cookie: attacker.cookie,
      body: {
        body: '他人がなりすまして更新を試みる本文です。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');
    expect(body).toHaveProperty('message');
  });

  it('存在しないアドバイスIDを更新しようとすると404になる', async () => {
    const req = createApiRequest('/api/advices/99999999/draft', 'PUT', {
      cookie: user.cookie,
      body: {
        body: '存在しないIDで更新を試みる本文です。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');
  });

  it('公開済みアドバイスは下書き更新できない', async () => {
    const req = createApiRequest(`/api/advices/${publishedAdviceId}/draft`, 'PUT', {
      cookie: user.cookie,
      body: {
        body: '公開済みを下書き更新しようとする本文です。',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe('NotFoundError');
    expect(body.message).toBe('相談アドバイスは公開されているため、更新できません。');
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest(`/api/advices/${draftAdviceId}/draft`, 'PUT', {
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
      const req = createApiRequest(`/api/advices/${invalidId}/draft`, 'PUT', {
        cookie: user.cookie,
        body: {
          body: '不正IDで下書き回答更新を試みる本文です。',
        },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      assertValidationError(body);
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('draft');
    }
  });

  it('本文が短すぎる場合（10文字未満）は400エラーになる', async () => {
    const req = createApiRequest(`/api/advices/${draftAdviceId}/draft`, 'PUT', {
      cookie: user.cookie,
      body: {
        body: 'short',
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    assertValidationError(body);
  });
});
