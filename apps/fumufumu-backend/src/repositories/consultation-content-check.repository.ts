import type { DbInstance } from "@/index";
import { consultations } from "@/db/schema/consultations";
import { contentChecks } from "@/db/schema/content-checks";
import { and, eq, inArray } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";

export class ConsultationContentCheckRepository {
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
	 * detail取得時の補助として、指定ID群のチェック状態をまとめて取得する
	 */
	async findConsultationContentCheckStatusesByIds(ids: number[]) {
		if (ids.length === 0) return [];

		return await this.db
			.select({
				targetId: contentChecks.targetId,
				status: contentChecks.status,
			})
			.from(contentChecks)
			.where(
				and(
					eq(contentChecks.targetType, "consultation"),
					inArray(contentChecks.targetId, ids),
				),
			);
	}

	/**
	 * 運営detail向けに、pending中の相談だけ本文付きで取得する
	 */
	async findPendingConsultationDetailsByIds(ids: number[]) {
		if (ids.length === 0) return [];

		return await this.db
			.select({
				id: consultations.id,
				title: consultations.title,
				body: consultations.body,
				authorId: consultations.authorId,
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
			.where(
				and(
					eq(contentChecks.status, "pending"),
					inArray(consultations.id, ids),
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
}
