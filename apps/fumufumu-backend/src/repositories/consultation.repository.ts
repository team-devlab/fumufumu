// Data層: 相談データアクセス
import { consultations } from "@/db/schema/consultations";
import type { DrizzleD1Database } from "drizzle-orm/d1";

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
			.select()
			.from(consultations);

		return getConsutationAll;
	}
}

