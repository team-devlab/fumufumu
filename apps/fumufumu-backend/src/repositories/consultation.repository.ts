import { users } from "@/db/schema/user";
import { consultations } from "@/db/schema/consultations";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

export interface ConsultationFilters {
	userId?: number;
	draft?: boolean;
	solved?: boolean;
}

export class ConsultationRepository {
	constructor(private db: DrizzleD1Database) {}

	/**
	 * 相談一覧を取得する
	 * filtersが空 or undefinedの場合は「全件取得」
	 * filters に項目があれば、where句で絞り込み
	 */
	async findAll(filters?: ConsultationFilters) {
		// WHERE条件を動的に構築
		const conditions = [];

		if (filters?.userId !== undefined) {
			conditions.push(eq(consultations.authorId, filters.userId));
		}

		if (filters?.draft !== undefined) {
			conditions.push(eq(consultations.draft, filters.draft));
		}

		if (filters?.solved !== undefined) {
			// solved=true: solved_at IS NOT NULL
			// solved=false: solved_at IS NULL
			conditions.push(
				filters.solved
					? isNotNull(consultations.solvedAt)
					: isNull(consultations.solvedAt)
			);
		}

		// クエリ実行
		let query = this.db
			.select({
				consultations: consultations,
				author: users,
			})
			.from(consultations)
			.leftJoin(users, eq(consultations.authorId, users.id));

		// 条件がある場合のみWHERE句を追加
		if (conditions.length > 0) {
			query = query.where(and(...conditions)) as typeof query;
		}

		return await query;
	}
}

