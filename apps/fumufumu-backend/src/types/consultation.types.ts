// DBから取得した相談データの型（Drizzle ORM型推論用）
export type Consultation = {
	id: number;
	title: string;
	body: string;
	draft: boolean;
	hiddenAt: Date | null;
	solvedAt: Date | null;
	authorId: number;
	createdAt: Date;
	updatedAt: Date;
};

// 投稿者情報
export type Author = {
	id: number;
	name: string;
	auth_service_user_id: string;
	disabled: boolean;
};

// APIレスポンス用の相談データ
export type ConsultationResponse = {
	id: number;
	title: string;
	body_preview: string;
	draft: boolean;
	hidden_at: string | null;
	solved_at: string | null;
	created_at: string;
	updated_at: string;
	author: Author;
};

// 相談リストレスポンス
export type ConsultationListResponse = {
	meta: {
		total: number;
	};
	data: ConsultationResponse[];
};