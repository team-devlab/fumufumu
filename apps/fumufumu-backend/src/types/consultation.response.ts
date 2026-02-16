import type { Author } from "@/types/user.types";
import type { AdviceResponse } from "@/types/advice.response";
import type { PaginationMeta } from "@/types/consultation.types";

// APIレスポンス用の相談データ
export type ConsultationResponse = {
	id: number;
	title: string;
	body_preview: string;
    // 本文（全文）
    body?: string;
	draft: boolean;
	hidden_at: string | null;
	solved_at: string | null;
	created_at: string;
	updated_at: string;
	author: Author | null;

    advices?: AdviceResponse[];
};

// 相談リストレスポンス
export type ConsultationListResponse = {
	pagination: PaginationMeta;
	data: ConsultationResponse[];
};

// 相談更新レスポンス
export type ConsultationSavedResponse = {
	id: number;
	draft: boolean;
	updated_at: string;
};

// APIレスポンス用の相談回答データ
export type AdviceSavedResponse = {
	id: number;
	draft: boolean;
	updated_at: string;
	created_at: string;
};
