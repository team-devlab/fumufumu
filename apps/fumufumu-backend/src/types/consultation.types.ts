// 相談データのフィルタ条件
export type ConsultationFilters = {
	userId?: number;
	draft?: boolean;
	solved?: boolean;
};

// Repository層から返される相談データ（RQB用）
export type ConsultationEntity = {
	id: number;
	title: string;
	body: string;
	draft: boolean;
	hiddenAt: Date | null;
	solvedAt: Date | null;
	authorId: number;
	createdAt: Date;
	updatedAt: Date;
	author: {
		id: number;
		name: string;
		disabled: boolean;
		createdAt: Date;
		updatedAt: Date;
	};
};