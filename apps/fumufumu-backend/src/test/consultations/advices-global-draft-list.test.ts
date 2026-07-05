import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import { setupIntegrationTest } from "../helpers/db-helper";
import { createAndLoginUser } from "../helpers/auth-helper";
import { createApiRequest } from "../helpers/request-helper";

/**
 * GET /api/advices?draft=true (相談横断のアドバイス下書き一覧) のテスト
 *
 * 下書きは本人限定の非公開データのため、可視性の否定パスを重点的に検証する。
 * - draft=true は本人の下書きのみを返す（公開済みは含まれない）
 * - 他人の userId を指定しても自分の下書きしか返らない（IDOR防止）
 * - draft 未指定では下書きが一覧に漏れない（secure by default）
 * - 未認証では取得できない
 * - draft 指定時は共有キャッシュに乗らない（Cache-Control: no-store）
 */
describe("Advices API - 相談横断の下書き一覧", () => {
  let admin: Awaited<ReturnType<typeof createAndLoginUser>>;
  let author: Awaited<ReturnType<typeof createAndLoginUser>>;
  let viewer: Awaited<ReturnType<typeof createAndLoginUser>>;
  let tagId: number;

  // author の下書きアドバイス / 公開アドバイス / viewer の下書きアドバイス
  let authorDraftAdviceId: number;
  let authorPublishedAdviceId: number;
  let viewerDraftAdviceId: number;

  const createApprovedConsultation = async (title: string) => {
    const createReq = createApiRequest("/api/consultations", "POST", {
      cookie: author.cookie,
      body: {
        title,
        body: `${title} の本文です。テスト用に十分な長さを持たせています。`,
        draft: false,
        tagIds: [tagId],
      },
    });
    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: number };

    const approveReq = createApiRequest(
      `/api/admin/content-check/consultations/${created.id}/decision`,
      "POST",
      { cookie: admin.cookie, body: { decision: "approved" } },
    );
    const approveRes = await app.fetch(approveReq, env);
    expect(approveRes.status).toBe(200);

    return created;
  };

  const createDraftAdvice = async (
    cookie: string,
    consultationId: number,
    body: string,
  ) => {
    const req = createApiRequest(
      `/api/consultations/${consultationId}/advice`,
      "POST",
      { cookie, body: { body, draft: true } },
    );
    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    return (await res.json()) as { id: number };
  };

  const createPublishedAdvice = async (
    consultationId: number,
    body: string,
  ) => {
    const req = createApiRequest(
      `/api/consultations/${consultationId}/advice`,
      "POST",
      { cookie: author.cookie, body: { body, draft: false } },
    );
    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    return (await res.json()) as { id: number };
  };

  const listAdvices = async (
    cookie: string | undefined,
    queryParams: Record<string, string | number | boolean> = {},
  ) => {
    const req = createApiRequest("/api/advices", "GET", {
      ...(cookie ? { cookie } : {}),
      queryParams,
    });
    return app.fetch(req, env);
  };

  beforeAll(async () => {
    await setupIntegrationTest();
    admin = await createAndLoginUser({ role: "admin" });
    author = await createAndLoginUser();
    viewer = await createAndLoginUser();

    const tagName = `advices-global-draft-list-tag-${Date.now()}`;
    await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(tagName).run();
    const tag = (await env.DB
      .prepare("SELECT id FROM tags WHERE name = ?")
      .bind(tagName)
      .first()) as { id: number } | null;
    expect(tag?.id).toBeDefined();
    tagId = tag!.id;

    // author の公開相談を2件用意し、一方に下書き回答、他方に公開回答を作る
    // （回答は相談×著者で一意になりうるため、下書き/公開で相談を分ける）
    const draftConsultation = await createApprovedConsultation(
      "global-draft-advices-draft-consultation",
    );
    const publishedConsultation = await createApprovedConsultation(
      "global-draft-advices-published-consultation",
    );

    const authorDraft = await createDraftAdvice(
      author.cookie,
      draftConsultation.id,
      "author の下書きアドバイス本文です。テスト用に十分な長さがあります。",
    );
    authorDraftAdviceId = authorDraft.id;

    const authorPublished = await createPublishedAdvice(
      publishedConsultation.id,
      "author の公開アドバイス本文です。テスト用に十分な長さがあります。",
    );
    authorPublishedAdviceId = authorPublished.id;

    // viewer は author の相談に自分の下書き回答を作る（本人限定の切り分け検証用）
    const viewerDraft = await createDraftAdvice(
      viewer.cookie,
      draftConsultation.id,
      "viewer の下書きアドバイス本文です。テスト用に十分な長さがあります。",
    );
    viewerDraftAdviceId = viewerDraft.id;
  });

  it("draft=true は本人の下書きのみを返す（公開済みは含まれない）", async () => {
    const res = await listAdvices(author.cookie, { draft: true });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { data: Array<{ id: number }> };

    expect(data.data.some((item) => item.id === authorDraftAdviceId)).toBe(true);
    // 公開済みアドバイスは下書き一覧に混ざらない
    expect(data.data.some((item) => item.id === authorPublishedAdviceId)).toBe(
      false,
    );
    // 他人(viewer)の下書きは返らない
    expect(data.data.some((item) => item.id === viewerDraftAdviceId)).toBe(false);
  });

  it("他人の userId を指定しても自分の下書きしか返らない（IDOR防止）", async () => {
    const res = await listAdvices(viewer.cookie, {
      draft: true,
      userId: author.appUserId,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { data: Array<{ id: number }> };

    // 認証ユーザー(viewer)の下書きだけが返り、指定した author の下書きは取得できない
    expect(data.data.some((item) => item.id === viewerDraftAdviceId)).toBe(true);
    expect(data.data.some((item) => item.id === authorDraftAdviceId)).toBe(false);
  });

  it("draft 未指定では下書きが一覧に漏れない（secure by default）", async () => {
    const res = await listAdvices(author.cookie);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { data: Array<{ id: number }> };

    expect(data.data.some((item) => item.id === authorDraftAdviceId)).toBe(false);
    expect(data.data.some((item) => item.id === viewerDraftAdviceId)).toBe(false);
  });

  it("認証なしでは下書きを取得できない（401）", async () => {
    const res = await listAdvices(undefined, { draft: true });
    expect(res.status).toBe(401);
  });

  it("draft 指定時は共有キャッシュに乗らない（Cache-Control: no-store）", async () => {
    const res = await listAdvices(author.cookie, { draft: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
