import { tags, consultationTaggings } from "@/db/schema/tags";
import { consultations } from "@/db/schema/consultations";
import type { DbInstance } from "@/index";
import { eq, and, isNull, sql } from "drizzle-orm";

export class TagRepository {
	constructor(private db: DbInstance) {}

	/**
	 * 全タグを公開済み相談の件数付きで取得する
	 *
	 * - sort_order ASC, id ASC の順で返却
	 * - count は公開済み（draft=false かつ hidden_at IS NULL）の相談のみを集計
	 *
	 * @returns タグ一覧（件数付き）
	 */
	async findAllWithCount() {
		const result = await this.db
			.select({
				id: tags.id,
				name: tags.name,
				sortOrder: tags.sortOrder,
				count: sql<number>`count(${consultations.id})`.as("count"),
			})
			.from(tags)
			.leftJoin(
				consultationTaggings,
				eq(tags.id, consultationTaggings.tagId),
			)
			.leftJoin(
				consultations,
				and(
					eq(consultationTaggings.consultationId, consultations.id),
					eq(consultations.draft, false),
					isNull(consultations.hiddenAt),
				),
			)
			.groupBy(tags.id)
			.orderBy(tags.sortOrder, tags.id);

		return result;
	}
}
