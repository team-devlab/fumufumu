import { users } from "@/db/schema/user";
import { consultations } from "@/db/schema/consultations";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

export class ConsultationRepository {
	constructor(private db: DrizzleD1Database) {}

	// TODO: findAll()メソッドを実装
	/**
	 * 相談一覧を取得する
	 * filtersが空 or undefinedの場合は「全件取得」
	 * filters に項目があれば、where句で絞り込み
	 */

	async findAll() {
		const getConsutationAll = await this.db
			.select({
				consultations: consultations,
				author: users,
			})
			.from(consultations)
			.leftJoin(users, eq(consultations.authorId, users.id));

		return getConsutationAll;
	}
}

