import { TagRepository } from "@/repositories/tag.repository";
import type { TagListResponse } from "@/types/tag.response";

export class TagService {
	constructor(private repository: TagRepository) {}

	/**
	 * タグ一覧を公開済み相談の件数付きで取得する
	 *
	 * @returns TagListResponse形式のタグ一覧
	 */
	async listTags(): Promise<TagListResponse> {
		const tags = await this.repository.findAllWithCount();

		// レスポンス形式へのマッピング
		const mappedTags = tags.map((tag) => ({
			id: tag.id,
			name: tag.name,
			sort_order: tag.sortOrder,
			count: tag.count,
		}));

		return {
			data: mappedTags,
		};
	}
}
