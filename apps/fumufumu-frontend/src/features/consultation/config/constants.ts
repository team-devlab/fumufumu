export const CONSULTATION_RULES = {
  TITLE_MAX_LENGTH: 60,
  BODY_MAX_LENGTH: 800,
  BODY_MIN_LENGTH: 10,
} as const;

// UI文言を一元管理
export const CONSULTATION_LABELS = {
  // 入力フォーム・確認画面共通
  TITLE: "タイトル",
  BODY: "相談内容",

  // 各種ステータス・表示
  TAGS_INPUT: "タグ選択",
  TAGS_CONFIRM: "選択されたタグ",
  NO_TAG: "タグ未選択",
  TAG_DEV_MESSAGE: "タグ機能は現在開発中です",

  // プレースホルダー
  PLACEHOLDER_TITLE:
    "例）エンジニア3年目：技術スペシャリストかマネジメント、どちらを目指すべき？",
  PLACEHOLDER_BODY: "質問内容を入力してください...",

  // 一覧表示用
  STATUS_SOLVED: "解決済み",
  ANONYMOUS_USER: "退会済みユーザー",
  MOCK_TAG_CAREER: "キャリア", // 仮実装用
} as const;
