import type { Author } from "@/types/user.types";
import type { PaginationMeta } from "@/types/consultation.types";

export type AdviceResponse = {
	id: number;
	body: string;
	draft: boolean;
	hidden_at: string | null;
	created_at: string;
	updated_at: string;
	author: Author | null;
};

export type AdviceListResponse = {
	pagination: PaginationMeta;
	data: AdviceResponse[];
};
