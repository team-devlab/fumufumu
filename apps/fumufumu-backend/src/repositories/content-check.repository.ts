import type { DbInstance } from "@/index";
import { consultations } from "@/db/schema/consultations";
import { advices } from "@/db/schema/advices";
import { contentChecks } from "@/db/schema/content-checks";
import { and, eq, inArray } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";

export class ContentCheckRepository {
	constructor(private db: DbInstance) {}

	/**
	 * 運営一覧(summary)向けに、pendingの相談チェックを作成順で取得する
	 */
	async listPendingConsultationContentChecks() {
		return await this.db
			.select({
				id: consultations.id,
				status: contentChecks.status,
				createdAt: consultations.createdAt,
			})
			.from(contentChecks)
			.innerJoin(
				consultations,
				and(
					eq(contentChecks.targetType, "consultation"),
					eq(contentChecks.targetId, consultations.id),
				),
			)
			.where(eq(contentChecks.status, "pending"))
			.orderBy(contentChecks.createdAt);
	}

	/**
	 * 運営detail向けに、指定IDのチェック状態と相談情報を1クエリで取得する
	 */
	async findConsultationChecksWithConsultationByIds(ids: number[]) {
		if (ids.length === 0) return [];

		return await this.db
			.select({
				targetId: contentChecks.targetId,
				status: contentChecks.status,
				id: consultations.id,
				title: consultations.title,
				body: consultations.body,
				authorId: consultations.authorId,
				createdAt: consultations.createdAt,
			})
			.from(contentChecks)
			.innerJoin(
				consultations,
				and(
					eq(contentChecks.targetType, "consultation"),
					eq(contentChecks.targetId, consultations.id),
				),
			)
			.where(
				and(
					inArray(contentChecks.targetId, ids),
				),
			);
	}

	/**
	 * 運営判断でpendingをapproved/rejectedへ遷移させる
	 */
	async updateConsultationContentCheckDecision(
		consultationId: number,
		decision: "approved" | "rejected",
		reason?: string,
	) {
		const [updated] = await this.db
			.update(contentChecks)
			.set({
				status: decision,
				reason: decision === "rejected" ? reason ?? null : null,
				checkedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(contentChecks.targetType, "consultation"),
					eq(contentChecks.targetId, consultationId),
					eq(contentChecks.status, "pending"),
				),
			)
			.returning();

		if (!updated) {
			throw new NotFoundError(`未処理の投稿チェックが見つかりません: consultationId=${consultationId}`);
		}

		return updated;
	}

	/**
	 * 運営一覧(summary)向けに、pendingのアドバイスチェックを作成順で取得する
	 */
	async listPendingAdviceContentChecks() {
		return await this.db
			.select({
				id: advices.id,
				consultationId: advices.consultationId,
				status: contentChecks.status,
				createdAt: advices.createdAt,
			})
			.from(contentChecks)
			.innerJoin(
				advices,
				and(
					eq(contentChecks.targetType, "advice"),
					eq(contentChecks.targetId, advices.id),
				),
			)
			.where(eq(contentChecks.status, "pending"))
			.orderBy(contentChecks.createdAt);
	}

	/**
	 * 運営detail向けに、指定IDのチェック状態とアドバイス情報を1クエリで取得する
	 */
	async findAdviceChecksWithAdviceByIds(ids: number[]) {
		if (ids.length === 0) return [];

		return await this.db
			.select({
				targetId: contentChecks.targetId,
				status: contentChecks.status,
				id: advices.id,
				consultationId: advices.consultationId,
				body: advices.body,
				authorId: advices.authorId,
				createdAt: advices.createdAt,
			})
			.from(contentChecks)
			.innerJoin(
				advices,
				and(
					eq(contentChecks.targetType, "advice"),
					eq(contentChecks.targetId, advices.id),
				),
			)
			.where(inArray(contentChecks.targetId, ids));
	}

	/**
	 * 運営判断でadviceのpendingをapproved/rejectedへ遷移させる
	 */
	async updateAdviceContentCheckDecision(
		adviceId: number,
		decision: "approved" | "rejected",
		reason?: string,
	) {
		const [updated] = await this.db
			.update(contentChecks)
			.set({
				status: decision,
				reason: decision === "rejected" ? reason ?? null : null,
				checkedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(contentChecks.targetType, "advice"),
					eq(contentChecks.targetId, adviceId),
					eq(contentChecks.status, "pending"),
				),
			)
			.returning();

		if (!updated) {
			throw new NotFoundError(`未処理の投稿チェックが見つかりません: adviceId=${adviceId}`);
		}

		return updated;
	}
}
