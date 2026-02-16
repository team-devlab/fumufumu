import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import app from '../../index';
import { setupIntegrationTest, forceSetSolved, forceSetHidden } from '../helpers/db-helper';
import { createAndLoginUser } from '../helpers/auth-helper';
import { createApiRequest } from '../helpers/request-helper';
import { ConsultationService } from '@/services/consultation.service';

describe('Consultations API - List & Filtering', () => {
  let user: Awaited<ReturnType<typeof createAndLoginUser>>;
  let solvedId: number;
  let tagId: number;

  beforeAll(async () => {
    // DBセットアップとテストユーザー作成
    await setupIntegrationTest();
    user = await createAndLoginUser();
    const tagName = `list-test-tag-${Date.now()}`;
    await env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tagName).run();
    const createdTag = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first() as { id: number } | null;
    expect(createdTag?.id).toBeDefined();
    tagId = createdTag!.id;

    // 公開相談（未解決）を作成
    await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: { title: '未解決の相談', body: 'これは未解決の本文です（10文字以上）', draft: false, tagIds: [tagId] }
    }), env);

    // 解決済みにするための相談を作成
    const res = await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: { title: '解決済みの相談', body: 'この相談はSQLで解決済みにされます。', draft: false, tagIds: [tagId] }
    }), env);
    expect(res.status).toBe(201);

    const data = await res.json() as any;
    expect(data.id).toBeDefined();
    solvedId = data.id;

    await forceSetSolved(solvedId);

    // テストデータの投入（必要に応じてここで複数件作成）
    const posts = [
      { title: '公開済み相談', body: 'これは公開済みの本文です（10文字以上）', draft: false, tagIds: [tagId] },
      { title: '下書き相談', body: 'これは下書きの本文です（10文字以上）', draft: true, tagIds: [tagId] },
    ];

    for (const post of posts) {
      const req = createApiRequest('/api/consultations', 'POST', {
        cookie: user.cookie,
        body: post,
      });
      await app.fetch(req, env);
    }
  });

  it('一覧取得: デフォルトで公開済みの相談が取得できる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const body = await res.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    expect(Array.isArray(body.data)).toBe(true);
    // draft: true はデフォルトで除外されていることを確認
    body.data.forEach((item: any) => {
      expect(item.draft).toBe(false);
    });

    // レスポンス構造の確認
    const firstItem = body.data[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('body_preview');
    expect(firstItem).toHaveProperty('draft');
    expect(firstItem).toHaveProperty('hidden_at');
    expect(firstItem).toHaveProperty('solved_at');
    expect(firstItem).toHaveProperty('created_at');
    expect(firstItem).toHaveProperty('updated_at');
    expect(firstItem).toHaveProperty('author');

    // authorの構造確認
    expect(firstItem.author).toHaveProperty('id');
    expect(firstItem.author).toHaveProperty('name');
    expect(firstItem.author).toHaveProperty('disabled');
    // 不要なフィールドが含まれていないことを確認
    expect(firstItem.author).not.toHaveProperty('createdAt');
    expect(firstItem.author).not.toHaveProperty('updatedAt');
  });

  it('フィルタ: solved=true: 解決済みの相談のみを取得できる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { solved: 'true' },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(Array.isArray(body.data)).toBe(true);

    // データが1件以上返ってきていることを保証する
    expect(body.data.length).toBeGreaterThan(0);

    // solved=true の場合、solved_at が null でないことを確認
    body.data.forEach((item: any) => {
      expect(item.solved_at).not.toBeNull();
    });
  });

  it('フィルタ: solved=false: 未解決の相談のみを取得できる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
        cookie: user.cookie,
        queryParams: { solved: 'false' },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(Array.isArray(body.data)).toBe(true);

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    // solved=false の場合、solved_at が null であることを確認
    body.data.forEach((item: any) => {
        expect(item.solved_at).toBeNull();
    });
  });

  it('フィルタ: draft=true で自分の下書きのみを取得できる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { draft: 'true' },
    });

    const res = await app.fetch(req, env);
    const body = await res.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    expect(body.data.every((item: any) => item.draft === true)).toBe(true);
    expect(body.data.every((item: any) => item.author.id === user.appUserId)).toBe(true);
  });

  it('セキュリティ: draft=true を指定しても、他人の下書きは一覧に含まれない', async () => {
    // 別のユーザーを作成
    const otherUser = await createAndLoginUser({ name: 'Other User' });
    
    // 他人が下書きを作成
    const createReq = createApiRequest('/api/consultations', 'POST', {
      cookie: otherUser.cookie,
      body: { title: '他人の下書き', body: '見えてはいけない本文内容です', draft: true, tagIds: [tagId] },
    });
    await app.fetch(createReq, env);

    // 自分が一覧を取得
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { draft: 'true' },
    });
    const res = await app.fetch(req, env);
    const body = await res.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    const leakedDraft = body.data.find((c: any) => c.title === '他人の下書き');
    expect(leakedDraft).toBeUndefined();
  });

  it('非表示(hiddenAt)が設定されている相談は、一覧に含まれない', async () => {
    // まずは通常の公開相談を作成する
    const createRes = await app.fetch(createApiRequest('/api/consultations', 'POST', {
        cookie: user.cookie,
        body: { 
            title: '非表示テスト用の相談', 
            body: 'この相談は作成後に SQL で非表示化されます。', 
            draft: false,
            tagIds: [tagId],
        }
    }), env);
    const createdData = await createRes.json() as any;
    const targetId = createdData.id;

    // SQL ヘルパーを使用して、DB 側で強制的に hidden_at を設定する
    await forceSetHidden(targetId);

    // 一覧 API を取得する
    const listRes = await app.fetch(createApiRequest('/api/consultations', 'GET', {
        cookie: user.cookie
    }), env);
    const body = await listRes.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    // 検証: 作成した ID が一覧（data）の中に存在しないことを確認する
    const hiddenItem = body.data.find((c: any) => c.id === targetId);
    expect(hiddenItem).toBeUndefined();

    // 全体の件数が 0 になっていないことも一応確認（他の公開データは見えるはず）
    expect(body.data.length).toBeGreaterThan(0);
  });


  it('フィルタ: userId で特定ユーザーの相談のみを取得できる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
        cookie: user.cookie,
        queryParams: { userId: user.appUserId.toString() },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(Array.isArray(body.data)).toBe(true);

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    // すべてのアイテムの author.id が user.appUserId と等しいことを確認
    body.data.forEach((item: any) => {
        expect(item.author.id).toBe(user.appUserId);
    });
  });

  it('複合フィルタ: userId + draft + solvedの組み合わせでフィルタできる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { 
        userId: user.appUserId.toString(),
        draft: 'false',
        solved: 'false',
      },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(Array.isArray(body.data)).toBe(true);

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    // すべてのアイテムが条件を満たすことを確認
    body.data.forEach((item: any) => {
      expect(item.author.id).toBe(user.appUserId);
      expect(item.draft).toBe(false);
      expect(item.solved_at).toBeNull();
    });
  });

  it('body_previewは100文字に切り取られている', async () => {
    // 100文字以上の本文で相談を作成
    const longBody = 'A'.repeat(150);
    await app.fetch(createApiRequest('/api/consultations', 'POST', {
      cookie: user.cookie,
      body: { title: '長い本文の相談', body: longBody, draft: false, tagIds: [tagId] },
    }), env);

    // 一覧を取得して、body_previewが100文字に切り取られていることを確認
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { title: '長い本文の相談' },
    });
    const res = await app.fetch(req, env);
    const body = await res.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    const item = body.data[0];
    expect(item.body_preview.length).toBeLessThanOrEqual(100);
    expect(item.body_preview).toBe(longBody.substring(0, 100));
  });


  it('ページネーション: limitを指定して件数を制御できる', async () => {
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { limit: 1 },
    });

    const res = await app.fetch(req, env);
    const body = await res.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    // レスポンス構造の確認（ページネーション対応）
    expect(body).toHaveProperty('pagination');
    expect(body).toHaveProperty('data');
    expect(body.pagination).toHaveProperty('total_items');
    expect(body.pagination).toHaveProperty('current_page');
    expect(body.pagination).toHaveProperty('per_page');
    expect(body.pagination).toHaveProperty('total_pages');
    expect(body.pagination).toHaveProperty('has_next');
    expect(body.pagination).toHaveProperty('has_prev');
    expect(Array.isArray(body.data)).toBe(true);

    // データの中身を確認
    if (body.data.length > 0) {
        const item = body.data[0];
        // 一覧APIでは基本情報のみ（body、advicesは含まれない）
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('body_preview');
        expect(item).toHaveProperty('draft');
        expect(item).toHaveProperty('created_at');
        expect(item).toHaveProperty('updated_at');
        expect(item).toHaveProperty('author');
        
        // bodyとadvicesは含まれないことを確認
        expect(item).not.toHaveProperty('body');
        expect(item).not.toHaveProperty('advices');
    }

    expect(body.data.length).toBe(1);
    expect(body.pagination.per_page).toBe(1);
  });

  it('セキュリティ: 他人の下書きは一覧に含まれない', async () => {
    // 別のユーザーを作成
    const otherUser = await createAndLoginUser({ name: 'Other User' });
    
    // 他人が下書きを作成
    const createReq = createApiRequest('/api/consultations', 'POST', {
      cookie: otherUser.cookie,
      body: { title: '他人の下書き', body: '見えてはいけない本文内容です', draft: true, tagIds: [tagId] },
    });
    await app.fetch(createReq, env);

    // 自分が一覧を取得
    const req = createApiRequest('/api/consultations', 'GET', {
      cookie: user.cookie,
      queryParams: { draft: 'true' },
    });
    const res = await app.fetch(req, env);
    const body = await res.json() as any;

    // データが1件以上返ってきていることを保証（サイレントパス防止）
    expect(body.data.length).toBeGreaterThan(0);

    const hasOtherDraft = body.data.some((c: any) => c.title === '他人の下書き');
    expect(hasOtherDraft).toBe(false);
  });

  describe('Pagination Edge Cases', () => {
    it('認証なしの場合401エラーを返す', async () => {
      const req = createApiRequest('/api/consultations', 'GET'); // Cookieなし
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(401);
      const body = await res.json() as any;

      // 成功時のプロパティ（dataなど）が「存在しない」ことを確認
      expect(body).not.toHaveProperty('data');
      expect(body).not.toHaveProperty('pagination');

      // エラー構造が正しいか（index.ts の定義と一致するか）を確認
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
    });

    it('不正なページ番号（0以下）は400エラーを返す (Zod共通バリデーション)', async () => {
      const req = createApiRequest('/api/consultations', 'GET', {
        cookie: user.cookie,
        queryParams: { page: 0 },
      });
      const res = await app.fetch(req, env);
      expect(res.status).toBe(400); // 握りつぶさずエラーを拾えているか確認
      const body = await res.json() as any;

      // index.ts の app.onError で定義したレスポンスを確認
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('入力内容に誤りがあります');

      // 成功時のプロパティ（dataなど）が「存在しない」ことを確認
      expect(body).not.toHaveProperty('data');
      expect(body).not.toHaveProperty('pagination');

      // エラー構造が正しいか（index.ts の定義と一致するか）を確認
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
    });

    it('limitが最大値(100)を超えると400エラーを返す (Zod共通バリデーション)', async () => {
      const req = createApiRequest('/api/consultations', 'GET', {
        cookie: user.cookie,
        queryParams: { limit: 101 },
      });
      const res = await app.fetch(req, env);
      expect(res.status).toBe(400);
      const body = await res.json() as any;

      // index.ts の app.onError で定義したレスポンスを確認
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('入力内容に誤りがあります');

      // 成功時のプロパティ（dataなど）が「存在しない」ことを確認
      expect(body).not.toHaveProperty('data');
      expect(body).not.toHaveProperty('pagination');

      // エラー構造が正しいか（index.ts の定義と一致するか）を確認
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
    });

    it('存在しないページを指定すると空配列と正しいメタデータを返す', async () => {
      const req = createApiRequest('/api/consultations', 'GET', {
        cookie: user.cookie,
        queryParams: { page: 999 },
      });
      const res = await app.fetch(req, env);
      const body = await res.json() as any;
      
      expect(body.data).toEqual([]);
      expect(res.status).toBe(200);
      expect(body.pagination.current_page).toBe(999);
      expect(body.pagination.has_next).toBe(false);

      // エラー構造が含まれていないことを確認
      expect(body).not.toHaveProperty('error');
      expect(body).not.toHaveProperty('message');
    });

    it('エラー処理: Serviceが失敗した場合に500エラーを返す', async () => {
        // 1. ConsultationService の特定のメソッドが呼ばれた時に、強制的にエラーを投げるようにスパイを仕込む
        const spy = vi.spyOn(ConsultationService.prototype, 'listConsultations')
                      .mockRejectedValue(new Error('Forced DB Error for Testing'));

        const req = createApiRequest('/api/consultations', 'GET', {
            cookie: user.cookie,
        });
        
        // 2. リクエスト実行
        const res = await app.fetch(req, env);
        
        // 3. アサーション
        expect(res.status).toBe(500);
        const body = await res.json() as any;
        
        // index.ts の app.onError で定義したレスポンスを確認
        expect(body.error).toBe('InternalServerError'); 
        expect(body.message).toBe('予期せぬエラーが発生しました');

        // 成功時のプロパティ（dataなど）が「存在しない」ことを確認
        expect(body).not.toHaveProperty('data');
        expect(body).not.toHaveProperty('pagination');

        // エラー構造が正しいか（index.ts の定義と一致するか）を確認
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');

        // 4. 後始末（重要：スパイを解除しないと、他のテストに影響が出ます）
        spy.mockRestore();
    });
  });
});
