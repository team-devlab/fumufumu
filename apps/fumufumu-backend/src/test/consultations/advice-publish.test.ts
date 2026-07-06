import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError, assertValidationError } from '../helpers/assert-helper';

describe('Advices API - Advice Draft Publish (PUT /advices/:id/publish)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
  let tagId: number;

  // 可視な親相談。ここに置いた下書きは公開できる
  let consultationId: number;
  let draftAdviceId: number; // 認可/検証で弾かれるテスト用(公開へは昇格しない)
  let publishTargetAdviceId: number; // 正常系で公開へ昇格させる
  let publishedAdviceId: number; // 既に公開済み(再公開不可の検証用)

  // 公開時点で親が非表示のケース用
  let hiddenParentConsultationId: number;
  let draftOnHiddenParentId: number;

  // 公開時点で親が未承認(pending)のケース用
  let unapprovedParentConsultationId: number;
  let draftOnUnapprovedParentId: number;

  const approveConsultation = async (id: number) => {
    await env.DB
      .prepare("UPDATE content_checks SET status = 'approved', checked_at = (cast(unixepoch('subsecond') * 1000 as integer)), updated_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE target_type = 'consultation' AND target_id = ?")
      .bind(id)
      .run();
  };

  const createApprovedConsultation = async (title: string): Promise<number> => {
    const res = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: { title, body: 'テスト本文です。10文字以上あります。', draft: false, tagIds: [tagId] },
    }), env);
    expect(res.status).toBe(201);
    const id = (await res.json() as { id: number }).id;
    await approveConsultation(id);
    return id;
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

    const tagName = `advice-publish-test-tag-${Date.now()}`;
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagName).run();
    const createdTag = await env.DB
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(tagName)
      .first() as { id: number } | null;
    expect(createdTag?.id).toBeDefined();
    tagId = createdTag!.id;

    consultationId = await createApprovedConsultation('公開テスト相談');
    publishedAdviceId = await postAdvice(consultationId, '公開済みの相談回答本文です。10文字以上あります。', false, user.cookie);
    draftAdviceId = await postAdvice(consultationId, '認可/検証テスト用の下書き本文です。10文字以上あります。', true, user.cookie);
    publishTargetAdviceId = await postAdvice(consultationId, '公開へ昇格させる下書き本文です。10文字以上あります。', true, user.cookie);

    // 下書きは可視な親にしか作れない(createAdvice)。作成後に親を非表示/未承認へ落として検証する
    hiddenParentConsultationId = await createApprovedConsultation('のちに非表示化する相談');
    draftOnHiddenParentId = await postAdvice(hiddenParentConsultationId, '非表示親に紐づく下書き本文です。10文字以上あります。', true, user.cookie);

    unapprovedParentConsultationId = await createApprovedConsultation('のちに未承認へ戻す相談');
    draftOnUnapprovedParentId = await postAdvice(unapprovedParentConsultationId, '未承認親に紐づく下書き本文です。10文字以上あります。', true, user.cookie);
  });

  it('本人の下書きを公開へ昇格でき、審査待ち content_check 作成・親相談 updatedAt 更新・本文反映が行われる', async () => {
    const before = await env.DB
      .prepare('SELECT updated_at FROM consultations WHERE id = ?')
      .bind(consultationId)
      .first() as { updated_at: number } | null;
    const parentUpdatedAtBefore = before!.updated_at;

    const newBody = '確認画面で仕上げてから公開する本文です。10文字以上あります。';
    const req = createApiRequest(`/api/advices/${publishTargetAdviceId}/publish`, 'PUT', {
      cookie: user.cookie,
      body: { body: newBody },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty('id', publishTargetAdviceId);
    expect(data).toHaveProperty('draft', false);
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('created_at');
    // 保存結果のみ(全文なし)。作成レスポンスと異なることを担保する
    expect(data).not.toHaveProperty('body');
    expect(data).not.toHaveProperty('author');

    // アドバイスが公開化され、確認画面で送った本文が反映されていること
    const advice = await env.DB
      .prepare('SELECT body, draft FROM advices WHERE id = ?')
      .bind(publishTargetAdviceId)
      .first() as { body: string; draft: number } | null;
    expect(advice?.draft).toBe(0);
    expect(advice?.body).toBe(newBody);

    // 審査待ちの content_check(advice) が作成されていること
    const contentCheck = await env.DB
      .prepare("SELECT status FROM content_checks WHERE target_type = 'advice' AND target_id = ?")
      .bind(publishTargetAdviceId)
      .first() as { status: string } | null;
    expect(contentCheck?.status).toBe('pending');

    // 親相談の updatedAt が更新されていること
    const after = await env.DB
      .prepare('SELECT updated_at FROM consultations WHERE id = ?')
      .bind(consultationId)
      .first() as { updated_at: number } | null;
    expect(after!.updated_at).toBeGreaterThan(parentUpdatedAtBefore);
  });

  it('既に公開済みのアドバイスは再公開できない(404)', async () => {
    const req = createApiRequest(`/api/advices/${publishedAdviceId}/publish`, 'PUT', {
      cookie: user.cookie,
      body: { body: '公開済みを再公開しようとする本文です。10文字以上あります。' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toBe('NotFoundError');
    expect(body.message).toBe('相談アドバイスは既に公開されているため、公開できません。');
  });

  it('他人の下書きアドバイスは公開できない(404, IDOR fail-closed)', async () => {
    const req = createApiRequest(`/api/advices/${draftAdviceId}/publish`, 'PUT', {
      cookie: attacker.cookie,
      body: { body: '他人がなりすまして公開を試みる本文です。10文字以上あります。' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');

    // なりすましで公開されていない(下書きのまま)ことを担保する
    const advice = await env.DB
      .prepare('SELECT draft FROM advices WHERE id = ?')
      .bind(draftAdviceId)
      .first() as { draft: number } | null;
    expect(advice?.draft).toBe(1);
  });

  it('存在しないアドバイスIDは公開できない(404)', async () => {
    const req = createApiRequest('/api/advices/99999999/publish', 'PUT', {
      cookie: user.cookie,
      body: { body: '存在しないIDで公開を試みる本文です。10文字以上あります。' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');
  });

  it('親相談が非表示のときは下書きを公開できない(404, fail-closed)', async () => {
    await env.DB
      .prepare("UPDATE consultations SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
      .bind(hiddenParentConsultationId)
      .run();

    const req = createApiRequest(`/api/advices/${draftOnHiddenParentId}/publish`, 'PUT', {
      cookie: user.cookie,
      body: { body: '非表示親の下書きを公開しようとする本文です。10文字以上あります。' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');

    // 公開されていない(下書きのまま)ことを担保する
    const advice = await env.DB
      .prepare('SELECT draft FROM advices WHERE id = ?')
      .bind(draftOnHiddenParentId)
      .first() as { draft: number } | null;
    expect(advice?.draft).toBe(1);
  });

  it('親相談が未承認(pending)のときは下書きを公開できない(404, fail-closed)', async () => {
    await env.DB
      .prepare("UPDATE content_checks SET status = 'pending' WHERE target_type = 'consultation' AND target_id = ?")
      .bind(unapprovedParentConsultationId)
      .run();

    const req = createApiRequest(`/api/advices/${draftOnUnapprovedParentId}/publish`, 'PUT', {
      cookie: user.cookie,
      body: { body: '未承認親の下書きを公開しようとする本文です。10文字以上あります。' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error', 'NotFoundError');

    const advice = await env.DB
      .prepare('SELECT draft FROM advices WHERE id = ?')
      .bind(draftOnUnapprovedParentId)
      .first() as { draft: number } | null;
    expect(advice?.draft).toBe(1);
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest(`/api/advices/${draftAdviceId}/publish`, 'PUT', {
      body: { body: '認証なしで公開を試みる本文です。10文字以上あります。' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    assertUnauthorizedError(body);
  });

  it('不正なID(0/-1/abc)を指定した場合400エラーを返す', async () => {
    const invalidIds = ['0', '-1', 'abc'];

    for (const invalidId of invalidIds) {
      const req = createApiRequest(`/api/advices/${invalidId}/publish`, 'PUT', {
        cookie: user.cookie,
        body: { body: '不正IDで公開を試みる本文です。10文字以上あります。' },
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
    const req = createApiRequest(`/api/advices/${draftAdviceId}/publish`, 'PUT', {
      cookie: user.cookie,
      body: { body: 'short' },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    assertValidationError(body);
  });
});
