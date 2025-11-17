import type { Author } from "@/types/user.types";

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

