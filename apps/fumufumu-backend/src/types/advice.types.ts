// 回答データのフィルタ条件
export type AdviceFilters = {
	userId?: number;
	// 下書き状態で絞り込む（true: 下書きのみ）。下書きは本人限定の非公開データのため、
	// Service層で userId をリクエスト本人へ強制する（相談の draft と同じ扱い）
	draft?: boolean;
	// サービス層でのみ使う内部フラグ（本人の一覧取得時のみ未承認を含める）。
	// 相談側 ConsultationFilters.includeUnapprovedForOwn と対称。userId===本人 のときだけ Service が立てる。
	includeUnapprovedForOwn?: boolean;
	// admin権限時のみ有効（コントローラ層でrole検証済みの値を渡す想定）。hidden_atが設定された回答も含める
	includeHidden?: boolean;
	// admin権限時のみ有効。hidden_atが設定された回答のみに絞り込む（includeHiddenと同時指定時はこちらを優先）
	hiddenOnly?: boolean;
};
