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