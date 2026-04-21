import type { DbInstance } from "@/index";
import { consultations } from "@/db/schema/consultations";
import { advices } from "@/db/schema/advices";
import { contentChecks } from "@/db/schema/content-checks";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";

type ResendCandidate =
	| {
		targetType: "consultation";
		targetId: number;
		status: "approved";
		authorId: number | null;
		title: string;
		checkedAt: Date | null;
	}
	| {
		targetType: "advice";
		targetId: number;
		status: "approved";
		authorId: number | null;
		consultationId: number;
		consultationTitle: string;
		checkedAt: Date | null;
	};

type NotificationUpdateResult = {
	targetType: "consultation" | "advice";
	targetId: number;
};

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

	/**
	 * 再送対象の approved レコードを target_type + target_id で単件取得する
	 */
	async findApprovedForResend(
		targetType: "consultation" | "advice",
		targetId: number,
	): Promise<ResendCandidate | null> {
		if (targetId <= 0) {
			return null;
		}

		if (targetType === "consultation") {
			const [row] = await this.db
				.select({
					targetId: contentChecks.targetId,
					authorId: consultations.authorId,
					title: consultations.title,
					checkedAt: contentChecks.checkedAt,
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
						eq(contentChecks.targetType, "consultation"),
						eq(contentChecks.targetId, targetId),
						eq(contentChecks.status, "approved"),
						isNull(contentChecks.notifiedAt),
					),
				)
				.limit(1);

			if (!row) {
				return null;
			}

			return {
				targetType: "consultation",
				targetId: row.targetId,
				status: "approved",
				authorId: row.authorId,
				title: row.title,
				checkedAt: row.checkedAt,
			};
		}

		const [row] = await this.db
			.select({
				targetId: contentChecks.targetId,
				authorId: advices.authorId,
				consultationId: advices.consultationId,
				consultationTitle: consultations.title,
				checkedAt: contentChecks.checkedAt,
			})
			.from(contentChecks)
			.innerJoin(
				advices,
				and(
					eq(contentChecks.targetType, "advice"),
					eq(contentChecks.targetId, advices.id),
				),
			)
			.innerJoin(consultations, eq(advices.consultationId, consultations.id))
			.where(
				and(
					eq(contentChecks.targetType, "advice"),
					eq(contentChecks.targetId, targetId),
					eq(contentChecks.status, "approved"),
					isNull(contentChecks.notifiedAt),
				),
			)
			.limit(1);

		if (!row) {
			return null;
		}

		return {
			targetType: "advice",
			targetId: row.targetId,
			status: "approved",
			authorId: row.authorId,
			consultationId: row.consultationId,
			consultationTitle: row.consultationTitle,
			checkedAt: row.checkedAt,
		};
	}

	/**
	 * 送信成功時に notified_at を確定し、直近エラーをクリアする
	 */
	async markNotificationSent(
		targetType: "consultation" | "advice",
		targetId: number,
	): Promise<NotificationUpdateResult | null> {
		if (targetId <= 0) {
			return null;
		}

		const [updated] = await this.db
			.update(contentChecks)
			.set({
				notifiedAt: new Date(),
				notifyLastError: null,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(contentChecks.targetType, targetType),
					eq(contentChecks.targetId, targetId),
					eq(contentChecks.status, "approved"),
					isNull(contentChecks.notifiedAt),
				),
			)
			.returning({
				targetType: contentChecks.targetType,
				targetId: contentChecks.targetId,
			});

		return updated ?? null;
	}

	/**
	 * 送信失敗時に直近エラーを保存する（未通知の approved のみ）
	 */
	async markNotificationFailed(
		targetType: "consultation" | "advice",
		targetId: number,
		errorMessage: string,
	): Promise<NotificationUpdateResult | null> {
		if (targetId <= 0) {
			return null;
		}

		const normalizedError = errorMessage.trim() || "unknown notification error";

		const [updated] = await this.db
			.update(contentChecks)
			.set({
				notifyLastError: normalizedError,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(contentChecks.targetType, targetType),
					eq(contentChecks.targetId, targetId),
					eq(contentChecks.status, "approved"),
					isNull(contentChecks.notifiedAt),
				),
			)
			.returning({
				targetType: contentChecks.targetType,
				targetId: contentChecks.targetId,
			});

		return updated ?? null;
	}
}
