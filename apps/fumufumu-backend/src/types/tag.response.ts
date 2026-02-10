// タグ個別のレスポンス型
export type TagResponse = {
	id: number;
	name: string;
	sort_order: number;
	count: number;
};

// タグ一覧のレスポンス型
export type TagListResponse = {
	data: TagResponse[];
};
