import type { Author } from "@/types/user.types";
import type { AdviceResponse } from "@/types/advice.response";
import type { PaginationMeta } from "@/types/consultation.types";

// 相談詳細に含める、紐づくタグ（下書き編集画面でのプリロード用に id/name のみ）
export type ConsultationTagResponse = {
	id: number;
	name: string;
};

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
	advice_pagination?: PaginationMeta;
	// 詳細取得時のみ含める。一覧では付与しない（body/advices と同じ扱い）
	tags?: ConsultationTagResponse[];
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
