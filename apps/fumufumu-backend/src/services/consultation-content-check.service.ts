import type { ConsultationContentCheckRepository } from "@/repositories/consultation-content-check.repository";
import type { ContentCheckStatus } from "@/db/schema/content-checks";

export class ConsultationContentCheckService {
	constructor(private repository: ConsultationContentCheckRepository) {}
	
	private static readonly PENDING_STATUS: ContentCheckStatus = "pending";

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
		const rows = await this.repository.findConsultationChecksWithConsultationByIds(ids);
		const seenIds = new Set<number>();
		const consultations: Array<{
			id: number;
			title: string;
			body: string;
			author_id: number | null;
			status: ContentCheckStatus;
			created_at: string;
		}> = [];
		const nonPending: Array<{ id: number; current_status: string }> = [];

		for (const row of rows) {
			seenIds.add(row.targetId);

			if (row.status === ConsultationContentCheckService.PENDING_STATUS) {
				consultations.push({
					id: row.id,
					title: row.title,
					body: row.body,
					author_id: row.authorId,
					status: row.status,
					created_at: row.createdAt.toISOString(),
				});
				continue;
			}

			nonPending.push({
				id: row.targetId,
				current_status: row.status,
			});
		}

		const missingIds = ids.filter((id) => !seenIds.has(id));

		return {
			consultations,
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

	async listPendingAdviceContentChecks() {
		const rows = await this.repository.listPendingAdviceContentChecks();
		return {
			advices: rows.map((row) => ({
				id: row.id,
				consultation_id: row.consultationId,
				status: row.status,
				created_at: row.createdAt.toISOString(),
			})),
		};
	}
}
