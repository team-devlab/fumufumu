import type { DbInstance } from "@/index";
import { consultations } from "@/db/schema/consultations";
import { advices } from "@/db/schema/advices";
import { moderationActions } from "@/db/schema/moderation-actions";
import type { ModerationTargetType, ModerationActionType } from "@/db/schema/moderation-actions";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";

type ModerationTargetRow = {
	id: number;
	hiddenAt: Date | null;
};

export class ModerationRepository {
	constructor(private db: DbInstance) {}

	private notFoundMessage(targetType: ModerationTargetType, targetId: number): string {
		return targetType === "consultation"
			? `対象の相談が見つかりません: id=${targetId}`
			: `対象のアドバイスが見つかりません: id=${targetId}`;
	}

	private async findTargetOrThrow(
		targetType: ModerationTargetType,
		targetId: number,
	): Promise<ModerationTargetRow> {
		if (targetType === "consultation") {
			const row = await this.db.query.consultations.findFirst({
				columns: { id: true, hiddenAt: true },
				where: eq(consultations.id, targetId),
			});
			if (!row) {
				throw new NotFoundError(this.notFoundMessage(targetType, targetId));
			}
			return row;
		}

		const row = await this.db.query.advices.findFirst({
			columns: { id: true, hiddenAt: true },
			where: eq(advices.id, targetId),
		});
		if (!row) {
			throw new NotFoundError(this.notFoundMessage(targetType, targetId));
		}
		return row;
	}

	private buildUpdateHiddenAtQuery(
		targetType: ModerationTargetType,
		targetId: number,
		hiddenAt: Date | null,
	) {
		if (targetType === "consultation") {
			return this.db
				.update(consultations)
				.set({ hiddenAt })
				.where(eq(consultations.id, targetId))
				.returning({ id: consultations.id, hiddenAt: consultations.hiddenAt });
		}

		return this.db
			.update(advices)
			.set({ hiddenAt })
			.where(eq(advices.id, targetId))
			.returning({ id: advices.id, hiddenAt: advices.hiddenAt });
	}

	private buildRecordActionQuery(
		targetType: ModerationTargetType,
		targetId: number,
		action: ModerationActionType,
		adminUserId: number,
		reason: string | null,
	) {
		return this.db.insert(moderationActions).values({
			targetType,
			targetId,
			action,
			reason,
			adminUserId,
		});
	}

	/**
	 * hidden_atの更新とmoderation_actionsへの記録を1バッチで実行する（consultation.repository.tsのupdate()と同じ原子性パターン）。
	 * skipAuditLog時はhidden_atの更新のみを単発実行する。
	 */
	private async applyHiddenAtChange(params: {
		targetType: ModerationTargetType;
		targetId: number;
		hiddenAt: Date | null;
		action: ModerationActionType;
		adminUserId: number;
		reason: string | null;
		skipAuditLog?: boolean;
	}): Promise<ModerationTargetRow> {
		const updateQuery = this.buildUpdateHiddenAtQuery(params.targetType, params.targetId, params.hiddenAt);

		if (params.skipAuditLog) {
			const [updated] = await updateQuery;
			if (!updated) {
				throw new NotFoundError(this.notFoundMessage(params.targetType, params.targetId));
			}
			return updated;
		}

		const recordActionQuery = this.buildRecordActionQuery(
			params.targetType,
			params.targetId,
			params.action,
			params.adminUserId,
			params.reason,
		);

		const [updateResult] = await this.db.batch([updateQuery, recordActionQuery]);
		const [updated] = updateResult;
		if (!updated) {
			throw new NotFoundError(this.notFoundMessage(params.targetType, params.targetId));
		}

		return updated;
	}

	/**
	 * hideは既にhiddenな対象への再実行も許容し、reasonを差し替える（ADR 011 §3.5）
	 */
	async hide(params: {
		targetType: ModerationTargetType;
		targetId: number;
		adminUserId: number;
		reason?: string;
		skipAuditLog?: boolean;
	}): Promise<ModerationTargetRow> {
		// 対象が存在しない場合にmoderation_actionsへ書き込んでしまわないよう、事前に存在確認する
		await this.findTargetOrThrow(params.targetType, params.targetId);

		return this.applyHiddenAtChange({
			targetType: params.targetType,
			targetId: params.targetId,
			hiddenAt: new Date(),
			action: "hide",
			adminUserId: params.adminUserId,
			reason: params.reason ?? null,
			skipAuditLog: params.skipAuditLog,
		});
	}

	/**
	 * unhideは既にunhiddenな対象にはno-opとする（ADR 011 §3.5）
	 */
	async unhide(params: {
		targetType: ModerationTargetType;
		targetId: number;
		adminUserId: number;
		skipAuditLog?: boolean;
	}): Promise<ModerationTargetRow> {
		const target = await this.findTargetOrThrow(params.targetType, params.targetId);

		if (target.hiddenAt === null) {
			return target;
		}

		return this.applyHiddenAtChange({
			targetType: params.targetType,
			targetId: params.targetId,
			hiddenAt: null,
			action: "unhide",
			adminUserId: params.adminUserId,
			reason: null,
			skipAuditLog: params.skipAuditLog,
		});
	}

	/**
	 * 対象のhide/unhide履歴を新しい順で取得する
	 */
	async findHistory(targetType: ModerationTargetType, targetId: number) {
		await this.findTargetOrThrow(targetType, targetId);

		return await this.db
			.select({
				id: moderationActions.id,
				action: moderationActions.action,
				reason: moderationActions.reason,
				adminUserId: moderationActions.adminUserId,
				createdAt: moderationActions.createdAt,
			})
			.from(moderationActions)
			.where(
				and(
					eq(moderationActions.targetType, targetType),
					eq(moderationActions.targetId, targetId),
				),
			)
			.orderBy(desc(moderationActions.createdAt));
	}
}
