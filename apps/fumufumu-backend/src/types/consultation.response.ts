import type { Author } from "@/types/user.types";
import type { AdviceResponse } from "@/types/advice.response";
import type { PaginationMeta } from "@/types/consultation.types";
import type { ContentCheckStatus } from "@/db/schema/content-checks";

// 相談に紐づくタグ（表示と下書き編集画面のプリロードに使うため id/name のみ）
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

	// 本人の own-view 一覧(?userId=自分)でのみ意味を持つ審査状態(#179)。
	// 本人が「審査中(pending)/却下(rejected)/承認済み(approved)」を判別するための additive フィールド。
	// 承認済みのみ返る公開一覧やチェック未登録の既存データは "approved" を返す。
	// additive・非breaking: 未指定でも既存クライアントに影響しない。却下理由(reason)の本人表示は #143 で別途拡張予定。
	review_status?: ContentCheckStatus;

    advices?: AdviceResponse[];
	advice_pagination?: PaginationMeta;
	// 一覧・詳細のどちらでも含める。相談カードにタグを表示するため(issue #193)。
	// 一覧に追加したのはフィールドの追加のみで、既存の呼び出しは壊れない。
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
