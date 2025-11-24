import { users } from "@/db/schema/user";
import { consultations } from "@/db/schema/consultations";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, isNull, isNotNull, type SQL } from "drizzle-orm";
import type { ConsultationFilters } from "@/types/consultation.types";

export class ConsultationRepository {
	constructor(private db: DrizzleD1Database) {}

	/**
	 * 相談一覧を取得する
	 * 
	 * @param filters - フィルタ条件（オプショナル）
	 * @param filters.userId - 著者IDで絞り込み
	 * @param filters.draft - 下書き状態で絞り込み（true: 下書きのみ, false: 公開済みのみ）
	 * @param filters.solved - 解決状態で絞り込み（true: 解決済みのみ, false: 未解決のみ）
	 * @returns 相談データと著者情報の配列
	 * @throws {Error} データベースクエリ実行エラー（上位層で処理）
	 */
	async findAll(filters?: ConsultationFilters) {
		const conditions: SQL[] = [];

		if (filters?.userId !== undefined) {
			conditions.push(eq(consultations.authorId, filters.userId));
		}

		if (filters?.draft !== undefined) {
			conditions.push(eq(consultations.draft, filters.draft));
		}

		if (filters?.solved !== undefined) {
			conditions.push(
				filters.solved
					? isNotNull(consultations.solvedAt)
					: isNull(consultations.solvedAt)
			);
		}

		const baseQuery = this.db
			.select({
				consultations: consultations,
				author: users,
			})
			.from(consultations)
			.leftJoin(users, eq(consultations.authorId, users.id));

		return conditions.length > 0
			? await baseQuery.where(and(...conditions))
			: await baseQuery;
	}
}

