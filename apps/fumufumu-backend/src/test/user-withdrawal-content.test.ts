import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../index";
import * as advicesSchema from "@/db/schema/advices";
import * as authSchema from "@/db/schema/auth";
import * as consultationsSchema from "@/db/schema/consultations";
import * as contentChecksSchema from "@/db/schema/content-checks";
import * as moderationActionsSchema from "@/db/schema/moderation-actions";
import * as tagsSchema from "@/db/schema/tags";
import * as userSchema from "@/db/schema/user";
import { UserRepository } from "@/repositories/user.repository";
import { UserService } from "@/services/user.service";
import { createAndLoginUser } from "./helpers/auth-helper";
import {
	approveAdvice,
	approveConsultation,
	rejectAdvice,
	setupIntegrationTest,
} from "./helpers/db-helper";
import { createApiRequest } from "./helpers/request-helper";

/**
 * 退会時の投稿の非対称処理（ADR 013 §4.3）の単体テスト。
 *
 * 下書き・回答0の公開相談は削除、回答ありの公開相談と本人の公開アドバイスは匿名化。
 * 「回答あり」= 公開表示される他者回答（approved / 旧データ無チェック）が1件以上。pending/rejected は数えない。
 * content_checks は FK が無く cascade されないため、削除される相談・アドバイス分が孤児化しないことも確認する。
 */
describe("退会 投稿の非対称処理", () => {
	const schema = {
		...authSchema,
		...userSchema,
		...consultationsSchema,
		...advicesSchema,
		...tagsSchema,
		...contentChecksSchema,
		...moderationActionsSchema,
	};

	let repository: UserRepository;
	let service: UserService;

	const BODY = "テスト用の本文です。十分な長さを確保しています。";

	const count = async (sql: string, ...binds: unknown[]): Promise<number> => {
		const row = (await env.DB.prepare(sql)
			.bind(...binds)
			.first()) as { c: number } | null;
		return Number(row?.c ?? 0);
	};

	const createTag = async (name: string): Promise<number> => {
		await env.DB.prepare("INSERT INTO tags (name) VALUES (?)").bind(name).run();
		const row = (await env.DB.prepare("SELECT id FROM tags WHERE name = ?")
			.bind(name)
			.first()) as { id: number };
		return row.id;
	};

	// 公開相談を作る（作成直後は content_check が pending）。visible にしたい時は approve する。
	const publishConsultation = async (
		cookie: string,
		tagId: number,
		title: string,
	): Promise<number> => {
		const res = await app.fetch(
			createApiRequest("/api/consultations", "POST", {
				cookie,
				body: { title, body: BODY, draft: false, tagIds: [tagId] },
			}),
			env,
		);
		expect(res.status).toBe(201);
		return ((await res.json()) as { id: number }).id;
	};

	const draftConsultation = async (cookie: string, title: string): Promise<number> => {
		const res = await app.fetch(
			createApiRequest("/api/consultations", "POST", {
				cookie,
				body: { title, body: BODY, draft: true },
			}),
			env,
		);
		expect(res.status).toBe(201);
		return ((await res.json()) as { id: number }).id;
	};

	const addAdvice = async (
		cookie: string,
		consultationId: number,
		draft = false,
	): Promise<number> => {
		const res = await app.fetch(
			createApiRequest(`/api/consultations/${consultationId}/advice`, "POST", {
				cookie,
				body: { body: BODY, draft },
			}),
			env,
		);
		expect(res.status).toBe(201);
		return ((await res.json()) as { id: number }).id;
	};

	const withdraw = async (user: Awaited<ReturnType<typeof createAndLoginUser>>) =>
		service.withdraw({ appUserId: user.appUserId, role: "user", inputEmail: user.email });

	beforeAll(async () => {
		await setupIntegrationTest();
		const db = drizzle(env.DB, { schema });
		repository = new UserRepository(db);
		service = new UserService(repository);
	});

	it("下書き相談は削除される", async () => {
		const user = await createAndLoginUser();
		const consultationId = await draftConsultation(user.cookie, "下書き相談");

		await withdraw(user);

		expect(await count("SELECT COUNT(*) AS c FROM consultations WHERE id = ?", consultationId)).toBe(0);
	});

	it("公開・回答0の相談は削除され、紐づく content_checks も消える（孤児化しない）", async () => {
		const user = await createAndLoginUser();
		const tagId = await createTag(`t-zero-${Date.now()}`);
		const consultationId = await publishConsultation(user.cookie, tagId, "回答0相談");

		// 作成時に相談の content_check(pending) が存在する。
		expect(
			await count(
				"SELECT COUNT(*) AS c FROM content_checks WHERE target_type='consultation' AND target_id = ?",
				consultationId,
			),
		).toBe(1);

		await withdraw(user);

		expect(await count("SELECT COUNT(*) AS c FROM consultations WHERE id = ?", consultationId)).toBe(0);
		expect(
			await count(
				"SELECT COUNT(*) AS c FROM content_checks WHERE target_type='consultation' AND target_id = ?",
				consultationId,
			),
		).toBe(0);
	});

	it("公開・approvedな他者回答ありの相談は匿名化して残り、他者の回答は無傷", async () => {
		const author = await createAndLoginUser();
		const answerer = await createAndLoginUser();
		const tagId = await createTag(`t-answered-${Date.now()}`);
		const consultationId = await publishConsultation(author.cookie, tagId, "回答あり相談");
		await approveConsultation(consultationId); // 回答を付けるため可視化
		const adviceId = await addAdvice(answerer.cookie, consultationId);
		await approveAdvice(adviceId); // 公開表示される他者回答にする

		await withdraw(author);

		// 相談は残り、著者だけ匿名化(null)。
		const row = (await env.DB.prepare(
			"SELECT author_id FROM consultations WHERE id = ?",
		)
			.bind(consultationId)
			.first()) as { author_id: number | null } | null;
		expect(row).not.toBeNull();
		expect(row?.author_id).toBeNull();

		// 他者の回答は著者も本文も無傷。
		const advice = (await env.DB.prepare(
			"SELECT author_id FROM advices WHERE id = ?",
		)
			.bind(adviceId)
			.first()) as { author_id: number | null } | null;
		expect(advice?.author_id).toBe(answerer.appUserId);
	});

	it("公開・他者回答が pending だけの相談は回答0扱いで削除され、回答も content_check も消える", async () => {
		const author = await createAndLoginUser();
		const answerer = await createAndLoginUser();
		const tagId = await createTag(`t-pending-${Date.now()}`);
		const consultationId = await publishConsultation(author.cookie, tagId, "pending回答相談");
		await approveConsultation(consultationId);
		const adviceId = await addAdvice(answerer.cookie, consultationId); // approve しない → pending

		await withdraw(author);

		expect(await count("SELECT COUNT(*) AS c FROM consultations WHERE id = ?", consultationId)).toBe(0);
		// pending 回答は cascade で消え、その content_check も明示削除される。
		expect(await count("SELECT COUNT(*) AS c FROM advices WHERE id = ?", adviceId)).toBe(0);
		expect(
			await count(
				"SELECT COUNT(*) AS c FROM content_checks WHERE target_type='advice' AND target_id = ?",
				adviceId,
			),
		).toBe(0);
	});

	it("公開・他者回答が rejected だけの相談は回答0扱いで削除される", async () => {
		const author = await createAndLoginUser();
		const answerer = await createAndLoginUser();
		const tagId = await createTag(`t-rejected-${Date.now()}`);
		const consultationId = await publishConsultation(author.cookie, tagId, "rejected回答相談");
		await approveConsultation(consultationId);
		const adviceId = await addAdvice(answerer.cookie, consultationId);
		await rejectAdvice(adviceId); // rejected → 公開されない → 数えない

		await withdraw(author);

		expect(await count("SELECT COUNT(*) AS c FROM consultations WHERE id = ?", consultationId)).toBe(0);
	});

	it("自分のアドバイスは『回答あり』に数えない（自分だけ触れた相談は削除）", async () => {
		const user = await createAndLoginUser();
		const tagId = await createTag(`t-self-${Date.now()}`);
		const consultationId = await publishConsultation(user.cookie, tagId, "自分回答相談");
		await approveConsultation(consultationId);
		const selfAdviceId = await addAdvice(user.cookie, consultationId);
		await approveAdvice(selfAdviceId); // 自分の公開回答（他者ではない）

		await withdraw(user);

		expect(await count("SELECT COUNT(*) AS c FROM consultations WHERE id = ?", consultationId)).toBe(0);
	});

	it("本人が他者の残る相談に書いた公開アドバイスは匿名化して残る", async () => {
		const answerer = await createAndLoginUser();
		const other = await createAndLoginUser();
		const tagId = await createTag(`t-myadvice-${Date.now()}`);
		const consultationId = await publishConsultation(other.cookie, tagId, "他者の相談");
		await approveConsultation(consultationId);
		const adviceId = await addAdvice(answerer.cookie, consultationId);

		await withdraw(answerer);

		// 相談(他者作)は残り、本人のアドバイスは残って著者だけ匿名化。
		expect(await count("SELECT COUNT(*) AS c FROM consultations WHERE id = ?", consultationId)).toBe(1);
		const advice = (await env.DB.prepare(
			"SELECT author_id FROM advices WHERE id = ?",
		)
			.bind(adviceId)
			.first()) as { author_id: number | null } | null;
		expect(advice).not.toBeNull();
		expect(advice?.author_id).toBeNull();
	});

	it("本人の下書きアドバイスは削除される", async () => {
		const answerer = await createAndLoginUser();
		const other = await createAndLoginUser();
		const tagId = await createTag(`t-draftadvice-${Date.now()}`);
		const consultationId = await publishConsultation(other.cookie, tagId, "下書きアドバイス先");
		await approveConsultation(consultationId);
		const draftAdviceId = await addAdvice(answerer.cookie, consultationId, true);

		await withdraw(answerer);

		expect(await count("SELECT COUNT(*) AS c FROM advices WHERE id = ?", draftAdviceId)).toBe(0);
	});

	it("getWithdrawalContentPlan: 混在ケースの件数（内訳＋合計）が正しい", async () => {
		const user = await createAndLoginUser();
		const other = await createAndLoginUser();
		const tagId = await createTag(`t-plan-${Date.now()}`);

		// 削除対象の相談: 下書き1 + 回答0公開1
		await draftConsultation(user.cookie, "計画-下書き");
		await publishConsultation(user.cookie, tagId, "計画-回答0");

		// 匿名化対象の相談: 回答あり公開1（他者approved回答）
		const answered = await publishConsultation(user.cookie, tagId, "計画-回答あり");
		await approveConsultation(answered);
		const otherAdvice = await addAdvice(other.cookie, answered);
		await approveAdvice(otherAdvice);

		// 他者の残る相談を用意し、本人の 公開アドバイス1（匿名化） + 下書きアドバイス1（削除）
		const otherConsultation = await publishConsultation(other.cookie, tagId, "計画-他者相談");
		await approveConsultation(otherConsultation);
		await addAdvice(user.cookie, otherConsultation, false); // 匿名化対象
		await addAdvice(user.cookie, otherConsultation, true); // 削除対象（下書き）

		const plan = await repository.getWithdrawalContentPlan(user.appUserId);

		expect(plan.counts.delete.consultations).toBe(2);
		expect(plan.counts.delete.advices).toBe(1);
		expect(plan.counts.delete.total).toBe(3);
		expect(plan.counts.anonymize.consultations).toBe(1);
		expect(plan.counts.anonymize.advices).toBe(1);
		expect(plan.counts.anonymize.total).toBe(2);
	});
});
