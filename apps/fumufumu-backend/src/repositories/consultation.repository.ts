import { consultations } from "@/db/schema/consultations";
import type { DbInstance } from "@/index";
import { eq, and, isNull, isNotNull, type SQL } from "drizzle-orm";
import type { ConsultationFilters } from "@/types/consultation.types";

export class ConsultationRepository {
	constructor(private db: DbInstance) {}

	/**
	 * 相談一覧を取得する（RQB使用）
	 * 
	 * @param filters - フィルタ条件（オプショナル）
	 * @param filters.userId - 著者IDで絞り込み
	 * @param filters.draft - 下書き状態で絞り込み（true: 下書きのみ, false: 公開済みのみ）
	 * @param filters.solved - 解決状態で絞り込み（true: 解決済みのみ, false: 未解決のみ）
	 * @returns 相談データと著者情報の配列
	 * @throws {Error} データベースクエリ実行エラー（上位層で処理）
	 */
	async findAll(filters?: ConsultationFilters) {
		const whereConditions: SQL[] = [];

		if (filters?.userId !== undefined) {
			whereConditions.push(eq(consultations.authorId, filters.userId));
		}

		if (filters?.draft !== undefined) {
			whereConditions.push(eq(consultations.draft, filters.draft));
		}

		if (filters?.solved !== undefined) {
			whereConditions.push(
				filters.solved
					? isNotNull(consultations.solvedAt)
					: isNull(consultations.solvedAt)
			);
		}

		return await this.db.query.consultations.findMany({
			where: whereConditions.length > 0 
				? and(...whereConditions) 
				: undefined,
			with: {
				author: true,
			},
		});
	}
}

