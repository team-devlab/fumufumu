import type { ContentCheckRepository } from "@/repositories/content-check.repository";
import type { ContentCheckStatus } from "@/db/schema/content-checks";

export class ConsultationContentCheckService {
	constructor(private repository: ContentCheckRepository) {}
	
	private static readonly PENDING_STATUS: ContentCheckStatus = "pending";

	private classifyPendingRows<T extends { targetId: number; status: ContentCheckStatus }>(
		rows: T[],
		ids: number[],
	) {
		const seenIds = new Set<number>();
		const pendingRows: T[] = [];
		const nonPending: Array<{ id: number; current_status: string }> = [];

		for (const row of rows) {
			seenIds.add(row.targetId);

			if (row.status === ConsultationContentCheckService.PENDING_STATUS) {
				pendingRows.push(row);
				continue;
			}

			nonPending.push({
				id: row.targetId,
				current_status: row.status,
			});
		}

		return {
			pendingRows,
			non_pending: nonPending,
			missing_ids: ids.filter((id) => !seenIds.has(id)),
		};
	}

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
		const classified = this.classifyPendingRows(rows, ids);
		const consultations: Array<{
			id: number;
			title: string;
			body: string;
			author_id: number | null;
			status: ContentCheckStatus;
			created_at: string;
		}> = classified.pendingRows.map((row) => ({
			id: row.id,
			title: row.title,
			body: row.body,
			author_id: row.authorId,
			status: row.status,
			created_at: row.createdAt.toISOString(),
		}));

		return {
			consultations,
			missing_ids: classified.missing_ids,
			non_pending: classified.non_pending,
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

	async findPendingAdvicesByIds(ids: number[]) {
		const rows = await this.repository.findAdviceChecksWithAdviceByIds(ids);
		const classified = this.classifyPendingRows(rows, ids);
		const advices: Array<{
			id: number;
			consultation_id: number;
			body: string;
			author_id: number | null;
			status: ContentCheckStatus;
			created_at: string;
		}> = classified.pendingRows.map((row) => ({
			id: row.id,
			consultation_id: row.consultationId,
			body: row.body,
			author_id: row.authorId,
			status: row.status,
			created_at: row.createdAt.toISOString(),
		}));

		return {
			advices,
			missing_ids: classified.missing_ids,
			non_pending: classified.non_pending,
		};
	}
}
