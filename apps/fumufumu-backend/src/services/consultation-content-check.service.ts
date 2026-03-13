import type { ConsultationContentCheckRepository } from "@/repositories/consultation-content-check.repository";

export class ConsultationContentCheckService {
	constructor(private repository: ConsultationContentCheckRepository) {}

	/**
	 * 運営向けsummaryレスポンスを組み立てる
	 */
	async listPendingConsultationContentChecks() {
		const rows = await this.repository.listPendingConsultationContentChecks();
		return {
			consultations: rows.map((row) => ({
				id: row.id,
				status: row.status,
				created_at: row.createdAt.toISOString(),
			})),
		};
	}

	/**
	 * 運営向けdetailレスポンスを組み立てる（missing/non-pendingの内訳も返す）
	 */
	async findPendingConsultationsByIds(ids: number[]) {
		const [statuses, pendingConsultations] = await Promise.all([
			this.repository.findConsultationContentCheckStatusesByIds(ids),
			this.repository.findPendingConsultationDetailsByIds(ids),
		]);

		const statusById = new Map(statuses.map((row) => [row.targetId, row.status]));
		const pendingIdSet = new Set(pendingConsultations.map((row) => row.id));

		const missingIds = ids.filter((id) => !statusById.has(id));
		const nonPending = ids
			.filter((id) => statusById.has(id) && !pendingIdSet.has(id))
			.map((id) => ({
				id,
				current_status: statusById.get(id)!,
			}));

		return {
			consultations: pendingConsultations.map((row) => ({
				id: row.id,
				title: row.title,
				body: row.body,
				author_id: row.authorId,
				status: row.status,
				created_at: row.createdAt.toISOString(),
			})),
			missing_ids: missingIds,
			non_pending: nonPending,
		};
	}

	/**
	 * 運営の承認/却下操作を実行し、APIレスポンス形式に整形する
	 */
	async decideConsultationContentCheck(
		consultationId: number,
		decision: "approved" | "rejected",
		reason?: string,
	) {
		const updated = await this.repository.updateConsultationContentCheckDecision(
			consultationId,
			decision,
			reason,
		);

		return {
			consultation_id: consultationId,
			status: updated.status,
			reason: updated.reason,
			checked_at: updated.checkedAt?.toISOString() ?? null,
			updated_at: updated.updatedAt.toISOString(),
		};
	}
}
