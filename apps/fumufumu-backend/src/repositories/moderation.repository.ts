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
				throw new NotFoundError(`対象の相談が見つかりません: id=${targetId}`);
			}
			return row;
		}

		const row = await this.db.query.advices.findFirst({
			columns: { id: true, hiddenAt: true },
			where: eq(advices.id, targetId),
		});
		if (!row) {
			throw new NotFoundError(`対象のアドバイスが見つかりません: id=${targetId}`);
		}
		return row;
	}

	private async setHiddenAt(
		targetType: ModerationTargetType,
		targetId: number,
		hiddenAt: Date | null,
	): Promise<ModerationTargetRow> {
		if (targetType === "consultation") {
			const [updated] = await this.db
				.update(consultations)
				.set({ hiddenAt })
				.where(eq(consultations.id, targetId))
				.returning({ id: consultations.id, hiddenAt: consultations.hiddenAt });
			return updated;
		}

		const [updated] = await this.db
			.update(advices)
			.set({ hiddenAt })
			.where(eq(advices.id, targetId))
			.returning({ id: advices.id, hiddenAt: advices.hiddenAt });
		return updated;
	}

	private async recordAction(
		targetType: ModerationTargetType,
		targetId: number,
		action: ModerationActionType,
		adminUserId: number,
		reason: string | null,
	): Promise<void> {
		await this.db.insert(moderationActions).values({
			targetType,
			targetId,
			action,
			reason,
			adminUserId,
		});
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
		await this.findTargetOrThrow(params.targetType, params.targetId);
		const updated = await this.setHiddenAt(params.targetType, params.targetId, new Date());

		if (!params.skipAuditLog) {
			await this.recordAction(
				params.targetType,
				params.targetId,
				"hide",
				params.adminUserId,
				params.reason ?? null,
			);
		}

		return updated;
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

		const updated = await this.setHiddenAt(params.targetType, params.targetId, null);

		if (!params.skipAuditLog) {
			await this.recordAction(params.targetType, params.targetId, "unhide", params.adminUserId, null);
		}

		return updated;
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
