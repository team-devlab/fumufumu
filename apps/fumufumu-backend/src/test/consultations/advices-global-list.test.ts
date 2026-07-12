import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import { setupIntegrationTest } from "../helpers/db-helper";
import { createAndLoginUser } from "../helpers/auth-helper";
import { createApiRequest } from "../helpers/request-helper";

/**
 * GET /api/advices (相談横断のアドバイス一覧) のテスト
 *
 * 【設計メモ】プロフィール画面の「自分のアドバイス一覧」(userIdフィルタ)と、
 * admin モデレーションの「公開中/非表示中」タブ(includeHidden/hiddenOnly)の両方から
 * 利用する共通APIのため、以下2系統を検証する。
 * - 親相談の可視性継承(hideのcascade, ADR 011 §4.1と同義): 親が非公開ならアドバイス単体は
 *   非表示でなくても一覧から除外される
 * - admin限定のincludeHidden/hiddenOnly: 親の状態に関わらずアドバイス自身の非表示状態で絞り込める
 */
describe("Advices API - 相談横断の一覧", () => {
  let admin: Awaited<ReturnType<typeof createAndLoginUser>>;
  let author: Awaited<ReturnType<typeof createAndLoginUser>>;
  let viewer: Awaited<ReturnType<typeof createAndLoginUser>>;
  let tagId: number;

  beforeAll(async () => {
    await setupIntegrationTest();
    admin = await createAndLoginUser({ role: "admin" });
    author = await createAndLoginUser();
    viewer = await createAndLoginUser();

    const tagName = `advices-global-list-tag-${Date.now()}`;
    await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(tagName).run();
    const tag = await env.DB
      .prepare("SELECT id FROM tags WHERE name = ?")
      .bind(tagName)
      .first() as { id: number } | null;
    expect(tag?.id).toBeDefined();
    tagId = tag!.id;
  });

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
    const created = await createRes.json() as { id: number };

    const approveReq = createApiRequest(`/api/admin/content-check/consultations/${created.id}/decision`, "POST", {
      cookie: admin.cookie,
      body: { decision: "approved" },
    });
    const approveRes = await app.fetch(approveReq, env);
    expect(approveRes.status).toBe(200);

    return created;
  };

  const createApprovedAdvice = async (consultationId: number, body: string) => {
    const createReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
      cookie: author.cookie,
      body: { body, draft: false },
    });
    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as { id: number };

    const approveReq = createApiRequest(`/api/admin/content-check/advices/${created.id}/decision`, "POST", {
      cookie: admin.cookie,
      body: { decision: "approved" },
    });
    const approveRes = await app.fetch(approveReq, env);
    expect(approveRes.status).toBe(200);

    return created;
  };

  // 審査未通過(pending)のアドバイスを作る。承認しないため content_check は pending のまま。
  // 親相談は公開可視である必要がある(createAdvice が可視親を要求する)ため approved 相談上に作る。
  const createPendingAdvice = async (consultationId: number, body: string) => {
    const createReq = createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
      cookie: author.cookie,
      body: { body, draft: false },
    });
    const createRes = await app.fetch(createReq, env);
    expect(createRes.status).toBe(201);
    return await createRes.json() as { id: number };
  };

  const rejectAdvice = async (adviceId: number) => {
    const req = createApiRequest(`/api/admin/content-check/advices/${adviceId}/decision`, "POST", {
      cookie: admin.cookie,
      body: { decision: "rejected", reason: "テスト却下" },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);
  };

  const hide = async (targetType: "consultations" | "advices", id: number, body: Record<string, unknown> = {}) => {
    const req = createApiRequest(`/api/admin/moderation/${targetType}/${id}/hide`, "POST", { cookie: admin.cookie, body });
    return app.fetch(req, env);
  };

  const listAdvices = async (cookie: string, queryParams: Record<string, string | number | boolean> = {}) => {
    const req = createApiRequest("/api/advices", "GET", { cookie, queryParams });
    return app.fetch(req, env);
  };

  it("公開中のアドバイスを一覧できる（所属相談のconsultation_idも返る）", async () => {
    const consultation = await createApprovedConsultation("global-advices-published-consultation");
    const advice = await createApprovedAdvice(consultation.id, "公開中アドバイス本文です。");

    const res = await listAdvices(viewer.cookie);
    expect(res.status).toBe(200);
    const data = await res.json() as { data: Array<{ id: number; consultation_id: number }> };
    const found = data.data.find((item) => item.id === advice.id);
    expect(found).toBeDefined();
    expect(found?.consultation_id).toBe(consultation.id);
  });

  it("親相談がhideされたアドバイスは、自身がhideされていなくても一覧から除外される（cascade）", async () => {
    const consultation = await createApprovedConsultation("global-advices-hidden-parent-consultation");
    const advice = await createApprovedAdvice(consultation.id, "親相談hideのcascade検証用アドバイス本文です。");
    const hideRes = await hide("consultations", consultation.id, { reason: "cascade検証" });
    expect(hideRes.status).toBe(200);

    const res = await listAdvices(viewer.cookie);
    expect(res.status).toBe(200);
    const data = await res.json() as { data: Array<{ id: number }> };
    expect(data.data.some((item) => item.id === advice.id)).toBe(false);
  });

  it("自身がhideされたアドバイスは、親相談が公開中でも一覧から除外される", async () => {
    const consultation = await createApprovedConsultation("global-advices-self-hidden-consultation");
    const advice = await createApprovedAdvice(consultation.id, "自身hide検証用アドバイス本文です。");
    const hideRes = await hide("advices", advice.id, { reason: "自身hide検証" });
    expect(hideRes.status).toBe(200);

    const res = await listAdvices(viewer.cookie);
    expect(res.status).toBe(200);
    const data = await res.json() as { data: Array<{ id: number }> };
    expect(data.data.some((item) => item.id === advice.id)).toBe(false);
  });

  it("userIdフィルタで著者本人のアドバイスに絞り込める", async () => {
    const consultation = await createApprovedConsultation("global-advices-userid-filter-consultation");
    const advice = await createApprovedAdvice(consultation.id, "userIdフィルタ検証用アドバイス本文です。");

    const res = await listAdvices(viewer.cookie, { userId: author.appUserId });
    expect(res.status).toBe(200);
    const data = await res.json() as { data: Array<{ id: number }> };
    expect(data.data.some((item) => item.id === advice.id)).toBe(true);
  });

  it("hiddenOnly: adminは親相談の状態に関わらず、自身がhideされたアドバイスのみに絞り込める", async () => {
    const consultation = await createApprovedConsultation("global-advices-hidden-only-consultation");
    const selfHiddenAdvice = await createApprovedAdvice(consultation.id, "hiddenOnly検証用の非表示アドバイス本文です。");
    const publishedAdvice = await createApprovedAdvice(consultation.id, "hiddenOnly検証用の公開アドバイス本文です。");
    const hideRes = await hide("advices", selfHiddenAdvice.id, { reason: "hiddenOnly検証" });
    expect(hideRes.status).toBe(200);

    const adminRes = await listAdvices(admin.cookie, { hiddenOnly: true });
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json() as { data: Array<{ id: number }> };
    expect(adminData.data.some((item) => item.id === selfHiddenAdvice.id)).toBe(true);
    expect(adminData.data.some((item) => item.id === publishedAdvice.id)).toBe(false);

    const nonAdminRes = await listAdvices(viewer.cookie, { hiddenOnly: true });
    const nonAdminData = await nonAdminRes.json() as { data: Array<{ id: number }> };
    expect(nonAdminData.data.some((item) => item.id === selfHiddenAdvice.id)).toBe(false);
  });

  it("includeHidden: adminは親相談がhideされたアドバイスも一覧に含められる", async () => {
    const consultation = await createApprovedConsultation("global-advices-include-hidden-parent-consultation");
    const advice = await createApprovedAdvice(consultation.id, "includeHiddenのcascade解除検証用アドバイス本文です。");
    const hideRes = await hide("consultations", consultation.id, { reason: "includeHidden検証" });
    expect(hideRes.status).toBe(200);

    const adminRes = await listAdvices(admin.cookie, { includeHidden: true });
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json() as { data: Array<{ id: number }> };
    expect(adminData.data.some((item) => item.id === advice.id)).toBe(true);
  });

  describe("審査状態フィールド(review_status, #179: 本人が審査中/却下/承認を判別できる)", () => {
    const findItem = (data: { data: Array<{ id: number; review_status?: string }> }, id: number) =>
      data.data.find((item) => item.id === id);

    it("own-view: 本人の審査中(pending)アドバイスも含まれ review_status=\"pending\" を返す", async () => {
      const consultation = await createApprovedConsultation("global-advices-own-pending");
      const advice = await createPendingAdvice(consultation.id, "本人には審査中として見えるべきアドバイス本文です。");

      const res = await listAdvices(author.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      const data = await res.json() as { data: Array<{ id: number; review_status?: string }> };
      const found = findItem(data, advice.id);
      expect(found).toBeDefined();
      expect(found?.review_status).toBe("pending");
    });

    it("own-view: 本人の承認済み(approved)アドバイスは review_status=\"approved\" を返す", async () => {
      const consultation = await createApprovedConsultation("global-advices-own-approved");
      const advice = await createApprovedAdvice(consultation.id, "本人の承認済みアドバイス本文です。");

      const res = await listAdvices(author.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      const data = await res.json() as { data: Array<{ id: number; review_status?: string }> };
      const found = findItem(data, advice.id);
      expect(found).toBeDefined();
      expect(found?.review_status).toBe("approved");
    });

    it("own-view: 本人の却下(rejected)アドバイスも一覧に残り review_status=\"rejected\" を返す(黙って消さない)", async () => {
      const consultation = await createApprovedConsultation("global-advices-own-rejected");
      const advice = await createPendingAdvice(consultation.id, "却下されるアドバイス本文です。");
      await rejectAdvice(advice.id);

      const res = await listAdvices(author.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      const data = await res.json() as { data: Array<{ id: number; review_status?: string }> };
      const found = findItem(data, advice.id);
      // Q1決定: 却下は本人一覧から除外せず、バッジで判別できるよう状態を返す
      expect(found).toBeDefined();
      expect(found?.review_status).toBe("rejected");
    });

    it("セキュリティ: 他人のuserId指定では本人の審査中アドバイスは露出しない(承認済みのみ)", async () => {
      const consultation = await createApprovedConsultation("global-advices-other-pending-hidden");
      const pendingAdvice = await createPendingAdvice(consultation.id, "他人には見えてはいけない審査中アドバイス本文です。");
      const approvedAdvice = await createApprovedAdvice(consultation.id, "他人からも見える承認済みアドバイス本文です。");

      // viewer が author のuserIdで一覧を引く(own-viewではない)
      const res = await listAdvices(viewer.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      const data = await res.json() as { data: Array<{ id: number }> };
      expect(data.data.some((item) => item.id === pendingAdvice.id)).toBe(false);
      expect(data.data.some((item) => item.id === approvedAdvice.id)).toBe(true);
    });

    it("own-view: 親相談がhideされると本人の審査中アドバイスも一覧から外れる(cascadeはown-viewでも維持)", async () => {
      const consultation = await createApprovedConsultation("global-advices-own-pending-parent-hidden");
      const advice = await createPendingAdvice(consultation.id, "親相談hide後は本人一覧からも消えるべき審査中アドバイス本文です。");
      const hideRes = await hide("consultations", consultation.id, { reason: "own-view cascade検証" });
      expect(hideRes.status).toBe(200);

      const res = await listAdvices(author.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      const data = await res.json() as { data: Array<{ id: number }> };
      // own-viewの未承認緩和はアドバイス自身の承認条件だけを外すもので、親相談の可視性cascade(ADR 011 §4.1)は
      // 維持する。親がhideされたら本人でも審査中アドバイスは見えない(相談own-viewがhidden相談を除外するのと対称)。
      expect(data.data.some((item) => item.id === advice.id)).toBe(false);
    });

    it("公開一覧(userId無し)でも承認済みは review_status=\"approved\" を持つ", async () => {
      const consultation = await createApprovedConsultation("global-advices-public-review-status");
      const advice = await createApprovedAdvice(consultation.id, "公開一覧のreview_status検証用アドバイス本文です。");

      const res = await listAdvices(viewer.cookie);
      expect(res.status).toBe(200);
      const data = await res.json() as { data: Array<{ id: number; review_status?: string }> };
      const found = findItem(data, advice.id);
      expect(found).toBeDefined();
      expect(found?.review_status).toBe("approved");
    });
  });

  describe("Cache-Control境界(#179: own-viewは未承認を含むため公開キャッシュに乗せない)", () => {
    it("?userId=自分(own-view)は no-store", async () => {
      const res = await listAdvices(author.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("?userId=他人(承認済みのみ返る)は public, max-age=60(一律no-storeを解いた)", async () => {
      const res = await listAdvices(viewer.cookie, { userId: author.appUserId });
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    });

    it("userId無しの公開一覧は public, max-age=60 のまま", async () => {
      const res = await listAdvices(viewer.cookie);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    });
  });
});
