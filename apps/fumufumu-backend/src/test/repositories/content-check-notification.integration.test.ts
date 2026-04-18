import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import type { DbInstance } from "@/index";
import app from "@/index";
import { ContentCheckRepository } from "@/repositories/content-check.repository";
import { setupIntegrationTest } from "@/test/helpers/db-helper";
import { createAndLoginUser } from "@/test/helpers/auth-helper";
import { createApiRequest } from "@/test/helpers/request-helper";
import * as authSchema from "@/db/schema/auth";
import * as userSchema from "@/db/schema/user";
import * as consultationsSchema from "@/db/schema/consultations";
import * as advicesSchema from "@/db/schema/advices";
import * as tagsSchema from "@/db/schema/tags";
import * as contentChecksSchema from "@/db/schema/content-checks";

const schema = {
	...authSchema,
	...userSchema,
	...consultationsSchema,
	...advicesSchema,
	...tagsSchema,
	...contentChecksSchema,
};

type TagRow = { id: number };
type ConsultationContentCheckRow = {
	status: "pending" | "approved" | "rejected";
	notifiedAt: number | null;
	notifyLastError: string | null;
};

function createRepository() {
	const db = drizzle(env.DB, { schema }) as unknown as DbInstance;
	return new ContentCheckRepository(db);
}

async function createTagId() {
	const tagName = `notification-test-tag-${crypto.randomUUID()}`;
	await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(tagName).run();
	const row = await env.DB
		.prepare("SELECT id FROM tags WHERE name = ?")
		.bind(tagName)
		.first();
	const typedRow = row as TagRow | null;

	expect(typedRow?.id).toBeDefined();
	return typedRow!.id;
}

async function createConsultation(cookie: string, tagId: number, title: string) {
	const req = createApiRequest("/api/consultations", "POST", {
		cookie,
		body: {
			title,
			body: `${title} 本文（通知テスト用）`,
			draft: false,
			tagIds: [tagId],
		},
	});

	const res = await app.fetch(req, env);
	expect(res.status).toBe(201);
	const data = await res.json() as { id: number };
	return data.id;
}

async function decideConsultation(
	cookie: string,
	consultationId: number,
	decision: "approved" | "rejected",
) {
	const req = createApiRequest(
		`/api/admin/content-check/consultations/${consultationId}/decision`,
		"POST",
		{
			cookie,
			body: decision === "rejected"
				? { decision, reason: "通知テストのため却下" }
				: { decision },
		},
	);

	const res = await app.fetch(req, env);
	expect(res.status).toBe(200);
}

async function findConsultationContentCheck(targetId: number) {
	return await env.DB
		.prepare(`
      SELECT
        status,
        notified_at AS notifiedAt,
        notify_last_error AS notifyLastError
      FROM content_checks
      WHERE target_type = 'consultation'
        AND target_id = ?
      LIMIT 1
	    `)
		.bind(targetId)
		.first() as Promise<ConsultationContentCheckRow | null>;
}

describe("ContentCheckRepository (notification)", () => {
	beforeAll(async () => {
		await setupIntegrationTest();
	});

	it("approved かつ notified_at IS NULL の相談だけが送信対象になる", async () => {
		const user = await createAndLoginUser();
		const tagId = await createTagId();

		const approvedUnnotifiedId = await createConsultation(
			user.cookie,
			tagId,
			"notification-approved-unnotified",
		);
		await decideConsultation(user.cookie, approvedUnnotifiedId, "approved");

		const approvedNotifiedId = await createConsultation(
			user.cookie,
			tagId,
			"notification-approved-notified",
		);
		await decideConsultation(user.cookie, approvedNotifiedId, "approved");
		await env.DB
			.prepare(`
        UPDATE content_checks
        SET notified_at = cast(unixepoch('subsecond') * 1000 as integer)
        WHERE target_type = 'consultation'
          AND target_id = ?
      `)
			.bind(approvedNotifiedId)
			.run();

		const rejectedId = await createConsultation(
			user.cookie,
			tagId,
			"notification-rejected",
		);
		await decideConsultation(user.cookie, rejectedId, "rejected");

		const pendingId = await createConsultation(
			user.cookie,
			tagId,
			"notification-pending",
		);

		const repository = createRepository();
		const rows = await repository.listPendingApprovedForNotification(200);
		const ids = new Set(rows.map((row) => row.id));

		expect(ids.has(approvedUnnotifiedId)).toBe(true);
		expect(ids.has(approvedNotifiedId)).toBe(false);
		expect(ids.has(rejectedId)).toBe(false);
		expect(ids.has(pendingId)).toBe(false);
	});

	it("markNotificationSent は notified_at を設定し notify_last_error をクリアする", async () => {
		const user = await createAndLoginUser();
		const tagId = await createTagId();
		const consultationId = await createConsultation(
			user.cookie,
			tagId,
			"notification-mark-sent",
		);
		await decideConsultation(user.cookie, consultationId, "approved");

		await env.DB
			.prepare(`
        UPDATE content_checks
        SET notify_last_error = 'previous send failure'
        WHERE target_type = 'consultation'
          AND target_id = ?
      `)
			.bind(consultationId)
			.run();

		const repository = createRepository();
		await repository.markNotificationSent("consultation", consultationId);
		const row = await findConsultationContentCheck(consultationId);

		expect(row).not.toBeNull();
		expect(row?.notifiedAt).not.toBeNull();
		expect(row?.notifyLastError).toBeNull();
	});

	it("markNotificationFailed は notified_at を維持しつつ notify_last_error を更新する", async () => {
		const user = await createAndLoginUser();
		const tagId = await createTagId();
		const consultationId = await createConsultation(
			user.cookie,
			tagId,
			"notification-mark-failed",
		);
		await decideConsultation(user.cookie, consultationId, "approved");

		const repository = createRepository();
		await repository.markNotificationFailed(
			"consultation",
			consultationId,
			"mail provider timeout",
		);
		const row = await findConsultationContentCheck(consultationId);

		expect(row).not.toBeNull();
		expect(row?.notifiedAt).toBeNull();
		expect(row?.notifyLastError).toBe("mail provider timeout");
	});

});
