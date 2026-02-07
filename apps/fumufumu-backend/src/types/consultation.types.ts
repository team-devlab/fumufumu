// 相談データのフィルタ条件
export type ConsultationFilters = {
	userId?: number;
	draft?: boolean;
	solved?: boolean;
};

/**
 * ページネーション用パラメータ（リクエスト）
 */
export type PaginationParams = {
	page: number;
	limit: number;
};

/**
 * ページネーション情報（レスポンス）
 */
export type PaginationMeta = {
	current_page: number;   // 現在のページ番号
	per_page: number;       // 1ページあたりの件数
	total_items: number;    // 全体の件数
	total_pages: number;    // 全体のページ数
	has_next: boolean;      // 次ページの有無
	has_prev: boolean;      // 前ページの有無
};