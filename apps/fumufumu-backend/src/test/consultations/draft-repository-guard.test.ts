import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import * as advicesSchema from "@/db/schema/advices";
import * as authSchema from "@/db/schema/auth";
import * as consultationsSchema from "@/db/schema/consultations";
import * as contentChecksSchema from "@/db/schema/content-checks";
import * as moderationActionsSchema from "@/db/schema/moderation-actions";
import * as tagsSchema from "@/db/schema/tags";
import * as userSchema from "@/db/schema/user";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { createAndLoginUser } from "../helpers/auth-helper";
import { setupIntegrationTest } from "../helpers/db-helper";
import { createApiRequest } from "../helpers/request-helper";

/**
 * Repository層の fail-closed ガードのテスト
 *
 * 下書きは本人限定の非公開データ。Service層(listConsultations / listAllAdvices)は draft 取得時に
 * userId をリクエスト本人へ強制するが、Repositoryを Service を介さず直接呼ぶ将来の経路でも
 * 事故らないよう、Repository単体で「draft=true かつ userId 未指定なら0件」を保証する。
 * ここでは Repository を直接呼び、Serviceの早期returnをすり抜けてもデータが漏れないことを検証する。
 */
describe("ConsultationRepository - 下書きの fail-closed ガード", () => {
  const schema = {
    ...authSchema,
    ...userSchema,
    ...consultationsSchema,
    ...advicesSchema,
    ...tagsSchema,
    ...contentChecksSchema,
    ...moderationActionsSchema,
  };

  let repository: ConsultationRepository;
  let userA: Awaited<ReturnType<typeof createAndLoginUser>>;
  let userB: Awaited<ReturnType<typeof createAndLoginUser>>;

  const createDraftConsultation = async (cookie: string, title: string) => {
    const req = createApiRequest("/api/consultations", "POST", {
      cookie,
      body: {
        title,
        body: `${title} の下書き本文です。テスト用に十分な長さがあります。`,
        draft: true,
      },
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(201);
    return (await res.json()) as { id: number };
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

  beforeAll(async () => {
    await setupIntegrationTest();
    repository = new ConsultationRepository(drizzle(env.DB, { schema }));

    const admin = await createAndLoginUser({ role: "admin" });
    userA = await createAndLoginUser();
    userB = await createAndLoginUser();

    // 相談の下書きを A/B それぞれ作成
    await createDraftConsultation(userA.cookie, "guard-consultation-a");
    await createDraftConsultation(userB.cookie, "guard-consultation-b");

    // アドバイス下書きを付けるための公開相談を用意(A作成 → admin承認)
    const tagName = `draft-guard-tag-${Date.now()}`;
    await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(tagName).run();
    const tag = (await env.DB
      .prepare("SELECT id FROM tags WHERE name = ?")
      .bind(tagName)
      .first()) as { id: number } | null;
    expect(tag?.id).toBeDefined();

    const publicRes = await app.fetch(
      createApiRequest("/api/consultations", "POST", {
        cookie: userA.cookie,
        body: {
          title: "guard-public-consultation",
          body: "アドバイス下書きを付ける公開相談の本文です。十分な長さがあります。",
          draft: false,
          tagIds: [tag!.id],
        },
      }),
      env,
    );
    expect(publicRes.status).toBe(201);
    const publicConsultation = (await publicRes.json()) as { id: number };
    const approveRes = await app.fetch(
      createApiRequest(
        `/api/admin/content-check/consultations/${publicConsultation.id}/decision`,
        "POST",
        { cookie: admin.cookie, body: { decision: "approved" } },
      ),
      env,
    );
    expect(approveRes.status).toBe(200);

    // 同じ公開相談に A/B それぞれの下書きアドバイスを作成
    await createDraftAdvice(userA.cookie, publicConsultation.id, "Aの下書きアドバイス本文です。十分な長さがあります。");
    await createDraftAdvice(userB.cookie, publicConsultation.id, "Bの下書きアドバイス本文です。十分な長さがあります。");
  });

  it("findAll: draft=true かつ userId 未指定なら0件を返す(全ユーザーの相談下書きを漏らさない)", async () => {
    const rows = await repository.findAll({ draft: true });
    expect(rows).toHaveLength(0);
    expect(await repository.count({ draft: true })).toBe(0);
  });

  it("findAll: draft=true かつ userId 指定ならその本人の相談下書きのみ返る(ガードは未指定時のみ作動)", async () => {
    const rows = await repository.findAll({ draft: true, userId: userA.appUserId });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.authorId === userA.appUserId)).toBe(true);
    expect(rows.some((row) => row.authorId === userB.appUserId)).toBe(false);
  });

  it("findAllAdvices: draft=true かつ userId 未指定なら0件を返す(全ユーザーのアドバイス下書きを漏らさない)", async () => {
    const rows = await repository.findAllAdvices({ draft: true });
    expect(rows).toHaveLength(0);
    expect(await repository.countAdvices({ draft: true })).toBe(0);
  });

  it("findAllAdvices: draft=true かつ userId 指定ならその本人のアドバイス下書きのみ返る(ガードは未指定時のみ作動)", async () => {
    const rows = await repository.findAllAdvices({
      draft: true,
      userId: userA.appUserId,
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.authorId === userA.appUserId)).toBe(true);
    expect(rows.some((row) => row.authorId === userB.appUserId)).toBe(false);
  });
});
