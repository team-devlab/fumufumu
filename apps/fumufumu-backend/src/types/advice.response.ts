import type { Author } from "@/types/user.types";

export type AdviceResponse = {
	id: number;
	body: string;
	draft: boolean;
	hidden_at: string | null;
	created_at: string;
	updated_at: string;
	author: Author | null;
};