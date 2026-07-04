import type { ModerationRepository } from "@/repositories/moderation.repository";
import type { ModerationTargetType } from "@/db/schema/moderation-actions";

export class ModerationService {
	constructor(private repository: ModerationRepository) {}

	private toTargetResponse(target: { id: number; hiddenAt: Date | null }, targetType: ModerationTargetType) {
		return {
			target_type: targetType,
			target_id: target.id,
			hidden_at: target.hiddenAt?.toISOString() ?? null,
		};
	}

	async hide(
		targetType: ModerationTargetType,
		targetId: number,
		adminUserId: number,
		reason?: string,
		skipAuditLog?: boolean,
	) {
		const updated = await this.repository.hide({
			targetType,
			targetId,
			adminUserId,
			reason,
			skipAuditLog,
		});

		return this.toTargetResponse(updated, targetType);
	}

	async unhide(
		targetType: ModerationTargetType,
		targetId: number,
		adminUserId: number,
		skipAuditLog?: boolean,
	) {
		const updated = await this.repository.unhide({
			targetType,
			targetId,
			adminUserId,
			skipAuditLog,
		});

		return this.toTargetResponse(updated, targetType);
	}

	/**
	 * 複数対象の「現在の非表示理由」をまとめて返す（非表示中タブの理由併記用）。
	 * 履歴が無い/理由なしhideの対象は null を返す。レスポンスは target_id をキーにしたマップ。
	 */
	async getLatestHideReasons(targetType: ModerationTargetType, targetIds: number[]) {
		const reasonByTarget = await this.repository.getLatestHideReasons(targetType, targetIds);

		const reasons: Record<number, string | null> = {};
		for (const id of targetIds) {
			reasons[id] = reasonByTarget.get(id) ?? null;
		}

		return { reasons };
	}

	async getHistory(targetType: ModerationTargetType, targetId: number) {
		const rows = await this.repository.findHistory(targetType, targetId);

		return {
			history: rows.map((row) => ({
				id: row.id,
				action: row.action,
				reason: row.reason,
				admin_user_id: row.adminUserId,
				created_at: row.createdAt.toISOString(),
			})),
		};
	}
}
