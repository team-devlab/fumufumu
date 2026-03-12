import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../index';
import { setupIntegrationTest } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { assertUnauthorizedError, assertValidationError } from '../helpers/assert-helper';

describe('Admin Content Check API - Consultations', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let anotherUser: Awaited<ReturnType<typeof createAndLoginUser>>;
  let tagId: number;

  beforeAll(async () => {
    await setupIntegrationTest();
    user = await createAndLoginUser();
    anotherUser = await createAndLoginUser();

    const tagName = `content-check-tag-${Date.now()}`;
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagName).run();
    const tag = await env.DB
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(tagName)
      .first() as { id: number } | null;

    expect(tag?.id).toBeDefined();
    tagId = tag!.id;
  });

  const createPublicConsultation = async (title: string) => {
    const req = createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: {
        title,
        body: `${title} の本文です。投稿チェック用に十分な長さを持たせています。`,
        draft: false,
        tagIds: [tagId],
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    return await res.json() as { id: number };
  };

  it('summary: pending相談の一覧を取得できる', async () => {
    const created = await createPublicConsultation('content-check-summary');

    const req = createApiRequest('/api/admin/content-check/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: {
        status: 'pending',
        view: 'summary',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as {
      consultations: Array<{ id: number; status: string; created_at: string }>;
    };

    const target = data.consultations.find((item) => item.id === created.id);
    expect(target).toBeDefined();
    expect(target?.status).toBe('pending');
    expect(new Date(target!.created_at).toString()).not.toBe('Invalid Date');
  });

  it('pending相談は通常一覧APIに露出しない', async () => {
    const created = await createPublicConsultation('pending-hidden-from-list');

    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: anotherUser.cookie,
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
    const data = await res.json() as { data: Array<{ id: number }> };

    expect(data.data.some((item) => item.id === created.id)).toBe(false);
  });

  it('pending相談は通常詳細APIで取得できない', async () => {
    const created = await createPublicConsultation('pending-hidden-from-detail');

    const req = createApiRequest(`/api/consultations/${created.id}`, 'GET', {
      cookie: anotherUser.cookie,
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it('detail: ids指定でpending詳細とmissing/non_pendingを返す', async () => {
    const pending = await createPublicConsultation('content-check-detail-pending');
    const approved = await createPublicConsultation('content-check-detail-approved');

    const decideReq = createApiRequest(`/api/admin/content-check/consultations/${approved.id}/decision`, 'POST', {
      cookie: user.cookie,
      body: { decision: 'approved' },
    });
    const decideRes = await app.fetch(decideReq, env);
    expect(decideRes.status).toBe(200);

    const req = createApiRequest('/api/admin/content-check/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: {
        status: 'pending',
        view: 'detail',
        ids: `${pending.id},${approved.id},99999999`,
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as {
      consultations: Array<{ id: number; status: string; title: string; body: string; author_id: number }>;
      missing_ids: number[];
      non_pending: Array<{ id: number; current_status: string }>;
    };

    expect(data.consultations.some((item) => item.id === pending.id)).toBe(true);
    expect(data.non_pending).toContainEqual({ id: approved.id, current_status: 'approved' });
    expect(data.missing_ids).toContain(99999999);
  });

  it('decision: approvedに更新できる', async () => {
    const created = await createPublicConsultation('content-check-decision-approved');

    const req = createApiRequest(`/api/admin/content-check/consultations/${created.id}/decision`, 'POST', {
      cookie: user.cookie,
      body: {
        decision: 'approved',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as {
      consultation_id: number;
      status: string;
      reason: string | null;
      checked_at: string | null;
      updated_at: string;
    };

    expect(data.consultation_id).toBe(created.id);
    expect(data.status).toBe('approved');
    expect(data.reason).toBeNull();
    expect(data.checked_at).not.toBeNull();
    expect(new Date(data.updated_at).toString()).not.toBe('Invalid Date');
  });

  it('decision: rejectedでreason未指定は400エラー', async () => {
    const created = await createPublicConsultation('content-check-decision-rejected');

    const req = createApiRequest(`/api/admin/content-check/consultations/${created.id}/decision`, 'POST', {
      cookie: user.cookie,
      body: {
        decision: 'rejected',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);

    const data = await res.json() as any;
    assertValidationError(data);
  });

  it('認証なしは401エラー', async () => {
    const req = createApiRequest('/api/admin/content-check/consultations', 'GET', {
      queryParams: {
        status: 'pending',
        view: 'summary',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);

    const data = await res.json() as any;
    assertUnauthorizedError(data);
  });
});
