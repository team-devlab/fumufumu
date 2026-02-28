import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../index';
import { setupIntegrationTest, forceSetHidden } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError } from '../helpers/assert-helper';

describe('Consultations API - Detail (GET /:id)', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let attacker: Awaited<ReturnType<typeof createAndLoginUser>>;
  let tagId: number;
  let existingId: number;

  const testBody = 'テスト本文です。10文字以上にします。';

  beforeAll(async () => {
    await setupIntegrationTest();

    user = await createAndLoginUser();
    attacker = await createAndLoginUser({ name: 'Attacker' });

    const tagName = `detail-test-tag-${Date.now()}`;
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
        title: 'テスト相談',
        body: testBody,
        draft: false,
        tagIds: [tagId],
      },
    }), env);

    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;
    existingId = created.id;
  });

  it('相談単体取得: 存在するIDの相談を取得できる（bodyとadvicesが含まれる）', async () => {
    const req = createApiRequest(`/api/consultations/${existingId}`, 'GET', {
      cookie: user.cookie,
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data).toHaveProperty('id');
    expect(data.id).toBe(existingId);
    expect(data).toHaveProperty('title');
    expect(data.title).toBe('テスト相談');

    expect(data).toHaveProperty('body');
    expect(data.body).toBe(testBody);

    expect(data).toHaveProperty('body_preview');
    expect(data.body_preview).toBe(testBody);
    expect(data).toHaveProperty('draft');
    expect(data).toHaveProperty('hidden_at');
    expect(data.hidden_at).toBeNull();
    expect(data).toHaveProperty('solved_at');
    expect(data.solved_at).toBeNull();
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
    expect(data).toHaveProperty('author');
    expect(data.author).toHaveProperty('name');
    expect(data.author).toHaveProperty('disabled');

    expect(data).toHaveProperty('advices');
    expect(Array.isArray(data.advices)).toBe(true);
    expect(data.advices.length).toBe(0);
  });

  it('【404 Not Found】存在しないIDを取得しようとするとエラーになる', async () => {
    const req = createApiRequest('/api/consultations/999999', 'GET', {
      cookie: user.cookie,
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);

    const data = await res.json() as any;
    expect(data.error).toBe('NotFoundError');
    expect(data.message).toBe('相談が見つかりません: id=999999');
  });

  it('相談詳細取得時、下書き状態の回答はリストに含まれない', async () => {
    const publicAdviceBody = '公開回答のテストです。10文字以上必要です。';
    const draftAdviceBody = '下書き回答のテストです。10文字以上必要です。';

    const createPublicAdviceReq = createApiRequest(`/api/consultations/${existingId}/advice`, 'POST', {
      cookie: user.cookie,
      body: { body: publicAdviceBody, draft: false },
    });
    const publicRes = await app.fetch(createPublicAdviceReq, env);
    expect(publicRes.status).toBe(201);

    const createDraftAdviceReq = createApiRequest(`/api/consultations/${existingId}/advice`, 'POST', {
      cookie: user.cookie,
      body: { body: draftAdviceBody, draft: true },
    });
    const draftRes = await app.fetch(createDraftAdviceReq, env);
    expect(draftRes.status).toBe(201);

    const detailReq = createApiRequest(`/api/consultations/${existingId}`, 'GET', {
      cookie: user.cookie,
    });
    const detailRes = await app.fetch(detailReq, env);
    expect(detailRes.status).toBe(200);

    const data = await detailRes.json() as any;

    // 検証: 公開回答は含まれるが、下書き回答は含まれないはず
    const publicAdvice = data.advices.find((a: any) => a.body === publicAdviceBody);
    const draftAdvice = data.advices.find((a: any) => a.body === draftAdviceBody);
    expect(publicAdvice).toBeDefined();
    expect(draftAdvice).toBeUndefined();
  });

  it('自分の下書き相談は取得できる', async () => {
    const createReq = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '自分だけが見れる下書き',
        body: 'これは下書きです。他人には見えません。',
        draft: true,
        tagIds: [tagId],
      },
    });

    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);

    const created = await createRes.json() as any;
    const draftId = created.id;

    const getReq = createApiRequest(`/api/consultations/${draftId}`, 'GET', {
      cookie: user.cookie,
    });
    const getRes = await app.fetch(getReq, env);

    expect(getRes.status).toBe(200);
    const data = await getRes.json() as any;
    expect(data.id).toBe(draftId);
    expect(data.title).toBe('自分だけが見れる下書き');
  });

  it('【404 Not Found】他人の下書き相談は取得できない', async () => {
    const createReq = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '秘密の下書き',
        body: 'これは攻撃者には見えてはいけない内容です。',
        draft: true,
        tagIds: [tagId],
      },
    });

    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;

    const getReq = createApiRequest(`/api/consultations/${created.id}`, 'GET', {
      cookie: attacker.cookie,
    });
    const getRes = await app.fetch(getReq, env);

    expect(getRes.status).toBe(404);
  });

  it('自分のhidden相談は取得できる', async () => {
    const createReq = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '自分のhidden相談',
        body: 'これは本人だけが閲覧できるhidden相談です。',
        draft: false,
        tagIds: [tagId],
      },
    });

    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);

    const created = await createRes.json() as any;
    await forceSetHidden(created.id);

    const getReq = createApiRequest(`/api/consultations/${created.id}`, 'GET', {
      cookie: user.cookie,
    });
    const getRes = await app.fetch(getReq, env);

    expect(getRes.status).toBe(200);
    const data = await getRes.json() as any;
    expect(data.id).toBe(created.id);
    expect(data.hidden_at).not.toBeNull();
  });

  it('【404 Not Found】他人のhidden相談は取得できない', async () => {
    const createReq = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '他人には見えないhidden相談',
        body: 'これは他人には閲覧できないhidden相談です。',
        draft: false,
        tagIds: [tagId],
      },
    });

    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);

    const created = await createRes.json() as any;
    await forceSetHidden(created.id);

    const getReq = createApiRequest(`/api/consultations/${created.id}`, 'GET', {
      cookie: attacker.cookie,
    });
    const getRes = await app.fetch(getReq, env);

    expect(getRes.status).toBe(404);
  });

  it('認証なしの場合401エラーを返す', async () => {
    const req = createApiRequest(`/api/consultations/${existingId}`, 'GET');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    assertUnauthorizedError(body);
  });

  it('不正なID(0/-1/abc)を指定した場合400エラーを返す', async () => {
    const invalidIds = ['0', '-1', 'abc'];

    for (const invalidId of invalidIds) {
      const req = createApiRequest(`/api/consultations/${invalidId}`, 'GET', {
        cookie: user.cookie,
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('入力内容に誤りがあります');
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('title');
    }
  });

  it('相談詳細取得時、hidden状態の回答はリストに含まれない', async () => {
    const consultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: 'hidden回答検証用の相談',
        body: 'hidden回答の除外を確認するための本文です。',
        draft: false,
        tagIds: [tagId],
      },
    }), env);
    expect(consultationRes.status).toBe(201);
    const consultation = await consultationRes.json() as any;

    const visibleAdviceBody = '表示される公開回答です。10文字以上必要です。';
    const hiddenAdviceBody = '非表示にする公開回答です。10文字以上必要です。';

    const visibleAdviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}/advice`, 'POST', {
      cookie: user.cookie,
      body: { body: visibleAdviceBody, draft: false },
    }), env);
    expect(visibleAdviceRes.status).toBe(201);

    const hiddenAdviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}/advice`, 'POST', {
      cookie: user.cookie,
      body: { body: hiddenAdviceBody, draft: false },
    }), env);
    expect(hiddenAdviceRes.status).toBe(201);
    const hiddenAdvice = await hiddenAdviceRes.json() as any;

    await env.DB
      .prepare("UPDATE advices SET hidden_at = (cast(unixepoch('subsecond') * 1000 as integer)) WHERE id = ?")
      .bind(hiddenAdvice.id)
      .run();

    const detailRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}`, 'GET', {
      cookie: user.cookie,
    }), env);
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json() as any;

    const visibleAdvice = detail.advices.find((a: any) => a.body === visibleAdviceBody);
    const hiddenAdviceInResponse = detail.advices.find((a: any) => a.body === hiddenAdviceBody);
    expect(visibleAdvice).toBeDefined();
    expect(hiddenAdviceInResponse).toBeUndefined();
  });

  it('相談詳細の回答はcreated_atの昇順で返る', async () => {
    const consultationRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title: '回答順序検証用の相談',
        body: '回答の並び順を確認するための本文です。',
        draft: false,
        tagIds: [tagId],
      },
    }), env);
    expect(consultationRes.status).toBe(201);
    const consultation = await consultationRes.json() as any;

    const newerBody = '新しい時刻を持つ回答です。10文字以上必要です。';
    const olderBody = '古い時刻を持つ回答です。10文字以上必要です。';

    const newerAdviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}/advice`, 'POST', {
      cookie: user.cookie,
      body: { body: newerBody, draft: false },
    }), env);
    expect(newerAdviceRes.status).toBe(201);
    const newerAdvice = await newerAdviceRes.json() as any;

    const olderAdviceRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}/advice`, 'POST', {
      cookie: user.cookie,
      body: { body: olderBody, draft: false },
    }), env);
    expect(olderAdviceRes.status).toBe(201);
    const olderAdvice = await olderAdviceRes.json() as any;

    const now = Date.now();
    const olderTs = now - 100000;
    const newerTs = now - 50000;
    await env.DB.prepare('UPDATE advices SET created_at = ? WHERE id = ?').bind(olderTs, olderAdvice.id).run();
    await env.DB.prepare('UPDATE advices SET created_at = ? WHERE id = ?').bind(newerTs, newerAdvice.id).run();

    const detailRes = await app.fetch(createApiRequest(`/api/consultations/${consultation.id}`, 'GET', {
      cookie: user.cookie,
    }), env);
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json() as any;

    const adviceBodies = detail.advices.map((a: any) => a.body);
    const olderIndex = adviceBodies.indexOf(olderBody);
    const newerIndex = adviceBodies.indexOf(newerBody);
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeLessThan(newerIndex);
  });
});
