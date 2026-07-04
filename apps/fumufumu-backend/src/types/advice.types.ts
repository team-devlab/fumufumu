// 回答データのフィルタ条件
export type AdviceFilters = {
	userId?: number;
	// admin権限時のみ有効（コントローラ層でrole検証済みの値を渡す想定）。hidden_atが設定された回答も含める
	includeHidden?: boolean;
	// admin権限時のみ有効。hidden_atが設定された回答のみに絞り込む（includeHiddenと同時指定時はこちらを優先）
	hiddenOnly?: boolean;
};
