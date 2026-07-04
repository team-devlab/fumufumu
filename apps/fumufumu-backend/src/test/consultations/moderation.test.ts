import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import { setupIntegrationTest } from "../helpers/db-helper";
import { createAndLoginUser } from "../helpers/auth-helper";
import { createApiRequest } from "../helpers/request-helper";
import { assertUnauthorizedError, assertValidationError } from "../helpers/assert-helper";

type ModerationTargetResponse = {
  target_type: "consultation" | "advice";
  target_id: number;
  hidden_at: string | null;
};

type ModerationHistoryResponse = {
  history: Array<{
    id: number;
    action: "hide" | "unhide";
    reason: string | null;
    admin_user_id: number;
    created_at: string;
  }>;
};

describe("Admin Moderation API - hide/unhide", () => {
  let admin: Awaited<ReturnType<typeof createAndLoginUser>>;
  let author: Awaited<ReturnType<typeof createAndLoginUser>>;
  let viewer: Awaited<ReturnType<typeof createAndLoginUser>>;
  let tagId: number;

  beforeAll(async () => {
    await setupIntegrationTest();
    admin = await createAndLoginUser({ role: "admin" });
    author = await createAndLoginUser();
    // hide/unhideの可視性は「本人以外の第三者」視点で検証する必要があるため、author/adminとは別に用意する
    viewer = await createAndLoginUser();

    const tagName = `moderation-tag-${Date.now()}`;
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
        body: `${title} の本文です。モデレーションテスト用に十分な長さを持たせています。`,
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

  const hide = async (targetType: "consultations" | "advices", id: number, body: Record<string, unknown> = {}, cookie = admin.cookie) => {
    const req = createApiRequest(`/api/admin/moderation/${targetType}/${id}/hide`, "POST", { cookie, body });
    return app.fetch(req, env);
  };

  const unhide = async (targetType: "consultations" | "advices", id: number, body: Record<string, unknown> = {}, cookie = admin.cookie) => {
    const req = createApiRequest(`/api/admin/moderation/${targetType}/${id}/unhide`, "POST", { cookie, body });
    return app.fetch(req, env);
  };

  const getHistory = async (targetType: "consultations" | "advices", id: number, cookie = admin.cookie) => {
    const req = createApiRequest(`/api/admin/moderation/${targetType}/${id}/history`, "GET", { cookie });
    return app.fetch(req, env);
  };

  it("hide: 相談をhideすると公開一覧・詳細から消える", async () => {
    const consultation = await createApprovedConsultation("moderation-hide-consultation");

    const hideRes = await hide("consultations", consultation.id, { reason: "テストのため非表示" });
    expect(hideRes.status).toBe(200);
    const hideData = await hideRes.json() as ModerationTargetResponse;
    expect(hideData.target_type).toBe("consultation");
    expect(hideData.target_id).toBe(consultation.id);
    expect(hideData.hidden_at).not.toBeNull();

    const listReq = createApiRequest("/api/consultations", "GET", { cookie: viewer.cookie });
    const listRes = await app.fetch(listReq, env);
    const listData = await listRes.json() as { data: Array<{ id: number }> };
    expect(listData.data.some((item) => item.id === consultation.id)).toBe(false);

    const detailReq = createApiRequest(`/api/consultations/${consultation.id}`, "GET", { cookie: viewer.cookie });
    const detailRes = await app.fetch(detailReq, env);
    expect(detailRes.status).toBe(404);
  });

  it("unhide: hideした相談をunhideすると復活する", async () => {
    const consultation = await createApprovedConsultation("moderation-unhide-consultation");
    const hideRes = await hide("consultations", consultation.id, { reason: "一時非表示" });
    expect(hideRes.status).toBe(200);

    const unhideRes = await unhide("consultations", consultation.id);
    expect(unhideRes.status).toBe(200);
    const unhideData = await unhideRes.json() as ModerationTargetResponse;
    expect(unhideData.hidden_at).toBeNull();

    const listReq = createApiRequest("/api/consultations", "GET", { cookie: viewer.cookie });
    const listRes = await app.fetch(listReq, env);
    const listData = await listRes.json() as { data: Array<{ id: number }> };
    expect(listData.data.some((item) => item.id === consultation.id)).toBe(true);
  });

  it("cascade: 相談hide時は助言一覧APIも404になり、unhideで復活する(ADR 011 §4)", async () => {
    const consultation = await createApprovedConsultation("moderation-cascade-consultation");
    await createApprovedAdvice(consultation.id, "cascadeテスト用のアドバイス本文です。十分な長さです。");

    const hideRes = await hide("consultations", consultation.id);
    expect(hideRes.status).toBe(200);

    const advicesReq = createApiRequest(`/api/consultations/${consultation.id}/advices`, "GET", { cookie: viewer.cookie });
    const advicesRes = await app.fetch(advicesReq, env);
    expect(advicesRes.status).toBe(404);

    const unhideRes = await unhide("consultations", consultation.id);
    expect(unhideRes.status).toBe(200);

    const advicesReq2 = createApiRequest(`/api/consultations/${consultation.id}/advices`, "GET", { cookie: viewer.cookie });
    const advicesRes2 = await app.fetch(advicesReq2, env);
    expect(advicesRes2.status).toBe(200);
  });

  it("advice hide: 個別hideで助言一覧から除外され、unhideで復活する", async () => {
    const consultation = await createApprovedConsultation("moderation-advice-hide-consultation");
    const advice = await createApprovedAdvice(consultation.id, "advice-hideテスト用の本文です。十分な長さです。");

    const hideRes = await hide("advices", advice.id, { reason: "アドバイス個別非表示" });
    expect(hideRes.status).toBe(200);
    const hideData = await hideRes.json() as ModerationTargetResponse;
    expect(hideData.target_type).toBe("advice");

    const listReq = createApiRequest(`/api/consultations/${consultation.id}/advices`, "GET", { cookie: author.cookie });
    const listRes = await app.fetch(listReq, env);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as { data: Array<{ id: number }> };
    expect(listData.data.some((item) => item.id === advice.id)).toBe(false);

    const unhideRes = await unhide("advices", advice.id);
    expect(unhideRes.status).toBe(200);

    const listReq2 = createApiRequest(`/api/consultations/${consultation.id}/advices`, "GET", { cookie: author.cookie });
    const listRes2 = await app.fetch(listReq2, env);
    const listData2 = await listRes2.json() as { data: Array<{ id: number }> };
    expect(listData2.data.some((item) => item.id === advice.id)).toBe(true);
  });

  it("skipAuditLog: true の場合はmoderation_actionsに積まれない", async () => {
    const consultation = await createApprovedConsultation("moderation-skip-audit-consultation");

    const hideRes = await hide("consultations", consultation.id, { reason: "監査ログ不要", skipAuditLog: true });
    expect(hideRes.status).toBe(200);

    const historyRes = await getHistory("consultations", consultation.id);
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json() as ModerationHistoryResponse;
    expect(historyData.history).toHaveLength(0);
  });

  it("skipAuditLog: false(default) の場合はmoderation_actionsに積まれる", async () => {
    const consultation = await createApprovedConsultation("moderation-record-audit-consultation");

    const hideRes = await hide("consultations", consultation.id, { reason: "監査ログを残す" });
    expect(hideRes.status).toBe(200);

    const historyRes = await getHistory("consultations", consultation.id);
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json() as ModerationHistoryResponse;
    expect(historyData.history).toHaveLength(1);
    expect(historyData.history[0]?.action).toBe("hide");
    expect(historyData.history[0]?.reason).toBe("監査ログを残す");
    expect(historyData.history[0]?.admin_user_id).toBe(admin.appUserId);
  });

  it("reason保存とhistory取得: hide→unhideの履歴が新しい順で返る", async () => {
    const consultation = await createApprovedConsultation("moderation-history-order-consultation");

    const hideRes = await hide("consultations", consultation.id, { reason: "履歴確認用の理由" });
    expect(hideRes.status).toBe(200);
    const unhideRes = await unhide("consultations", consultation.id);
    expect(unhideRes.status).toBe(200);

    const historyRes = await getHistory("consultations", consultation.id);
    const historyData = await historyRes.json() as ModerationHistoryResponse;
    expect(historyData.history).toHaveLength(2);
    expect(historyData.history[0]?.action).toBe("unhide");
    expect(historyData.history[0]?.reason).toBeNull();
    expect(historyData.history[1]?.action).toBe("hide");
    expect(historyData.history[1]?.reason).toBe("履歴確認用の理由");
  });

  it("冪等性: 既にhidden な対象へのhideはreasonを差し替えて記録する(ADR 011 §3.5)", async () => {
    const consultation = await createApprovedConsultation("moderation-idempotent-hide-consultation");

    const firstHide = await hide("consultations", consultation.id, { reason: "最初の理由" });
    expect(firstHide.status).toBe(200);
    const secondHide = await hide("consultations", consultation.id, { reason: "差し替え後の理由" });
    expect(secondHide.status).toBe(200);

    const historyRes = await getHistory("consultations", consultation.id);
    const historyData = await historyRes.json() as ModerationHistoryResponse;
    expect(historyData.history).toHaveLength(2);
    expect(historyData.history[0]?.reason).toBe("差し替え後の理由");
  });

  it("冪等性: 既にunhiddenな対象へのunhideはno-opでmoderation_actionsに積まれない(ADR 011 §3.5)", async () => {
    const consultation = await createApprovedConsultation("moderation-idempotent-unhide-consultation");

    const unhideRes = await unhide("consultations", consultation.id);
    expect(unhideRes.status).toBe(200);
    const unhideData = await unhideRes.json() as ModerationTargetResponse;
    expect(unhideData.hidden_at).toBeNull();

    const historyRes = await getHistory("consultations", consultation.id);
    const historyData = await historyRes.json() as ModerationHistoryResponse;
    expect(historyData.history).toHaveLength(0);
  });

  it("認可: 非adminでhide/unhide/historyは404", async () => {
    const consultation = await createApprovedConsultation("moderation-non-admin-consultation");

    const hideRes = await hide("consultations", consultation.id, {}, author.cookie);
    expect(hideRes.status).toBe(404);

    const unhideRes = await unhide("consultations", consultation.id, {}, author.cookie);
    expect(unhideRes.status).toBe(404);

    const historyRes = await getHistory("consultations", consultation.id, author.cookie);
    expect(historyRes.status).toBe(404);
  });

  it("認証なしは401エラー", async () => {
    const req = createApiRequest("/api/admin/moderation/consultations/1/hide", "POST", {
      body: { reason: "認証なし" },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
    const data = await res.json() as unknown;
    assertUnauthorizedError(data);
  });

  it("存在しない対象へのhide/unhideは404", async () => {
    const hideRes = await hide("consultations", 99999999, { reason: "存在しない対象" });
    expect(hideRes.status).toBe(404);

    const unhideRes = await unhide("consultations", 99999999);
    expect(unhideRes.status).toBe(404);
  });

  it("targetTypeが不正な値の場合は400エラー", async () => {
    const req = createApiRequest("/api/admin/moderation/unknown-type/1/hide", "POST", {
      cookie: admin.cookie,
      body: {},
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const data = await res.json() as unknown;
    assertValidationError(data);
  });

  it("includeHidden: adminはhideされた投稿を一覧に含められる", async () => {
    const consultation = await createApprovedConsultation("moderation-include-hidden-consultation");
    const hideRes = await hide("consultations", consultation.id, { reason: "includeHidden検証" });
    expect(hideRes.status).toBe(200);

    const adminListReq = createApiRequest("/api/consultations", "GET", {
      cookie: admin.cookie,
      queryParams: { includeHidden: true },
    });
    const adminListRes = await app.fetch(adminListReq, env);
    const adminListData = await adminListRes.json() as { data: Array<{ id: number }> };
    expect(adminListData.data.some((item) => item.id === consultation.id)).toBe(true);

    const nonAdminListReq = createApiRequest("/api/consultations", "GET", {
      cookie: author.cookie,
      queryParams: { includeHidden: true },
    });
    const nonAdminListRes = await app.fetch(nonAdminListReq, env);
    const nonAdminListData = await nonAdminListRes.json() as { data: Array<{ id: number }> };
    expect(nonAdminListData.data.some((item) => item.id === consultation.id)).toBe(false);
  });

  it("includeHidden: adminはhideされた相談の助言一覧も閲覧できる", async () => {
    const consultation = await createApprovedConsultation("moderation-include-hidden-advices-consultation");
    await createApprovedAdvice(consultation.id, "includeHiddenのcascade検証用アドバイス本文です。");
    const hideRes = await hide("consultations", consultation.id);
    expect(hideRes.status).toBe(200);

    const adminAdvicesReq = createApiRequest(`/api/consultations/${consultation.id}/advices`, "GET", {
      cookie: admin.cookie,
      queryParams: { includeHidden: true },
    });
    const adminAdvicesRes = await app.fetch(adminAdvicesReq, env);
    expect(adminAdvicesRes.status).toBe(200);

    const viewerAdvicesReq = createApiRequest(`/api/consultations/${consultation.id}/advices`, "GET", {
      cookie: viewer.cookie,
      queryParams: { includeHidden: true },
    });
    const viewerAdvicesRes = await app.fetch(viewerAdvicesReq, env);
    expect(viewerAdvicesRes.status).toBe(404);
  });
});
