// 回答データのフィルタ条件
export type AdviceFilters = {
	// 著者IDで「絞り込む」フィルタ（プロフィールの自分のアドバイス一覧など）。指定した著者の回答のみに限定する。
	userId?: number;
	// 閲覧者本人のID。userId(絞り込み)とは別軸で、可視性条件に「author===viewerId」をORで“足す”ためのもの(#179 Phase2)。
	// 相談詳細(/:id, /:id/advices)で、公開(承認済み)の回答に加え、閲覧者本人の非下書き回答
	// (投稿チェック中/公開見送り)も親相談上に inline 表示するために使う。他者の未公開は漏らさない(fail-closed)。
	viewerId?: number;
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
