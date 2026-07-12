import type { Author } from "@/types/user.types";
import type { PaginationMeta } from "@/types/consultation.types";
import type { ContentCheckStatus } from "@/db/schema/content-checks";

export type AdviceResponse = {
	id: number;
	consultation_id: number;
	body: string;
	draft: boolean;
	hidden_at: string | null;
	created_at: string;
	updated_at: string;
	author: Author | null;

	// 本人の own-view 一覧(?userId=自分)でのみ意味を持つ審査状態(#179)。相談 ConsultationResponse.review_status と対称。
	// 本人が「審査中(pending)/却下(rejected)/承認済み(approved)」を判別するための additive フィールド。
	// 承認済みのみ返る公開一覧やチェック未登録の既存データは "approved" を返す。
	// additive・非breaking: 未指定でも既存クライアントに影響しない。却下理由(reason)の本人表示は #143 で別途拡張予定。
	review_status?: ContentCheckStatus;
};

export type AdviceListResponse = {
	pagination: PaginationMeta;
	data: AdviceResponse[];
};
