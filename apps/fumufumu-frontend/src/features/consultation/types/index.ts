export interface Author {
  id: number;
  name: string;
  disabled: boolean;
}

/**
 * 投稿の審査状態。backend の content_checks.status を mirror する。
 * src: apps/fumufumu-backend/src/db/schema/content-checks.ts (CONTENT_CHECK_STATUSES)
 */
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Consultation {
  id: number;
  title: string;
  /**
   * 一覧表示用にトリミングされた本文（全文ではない点に注意）
   */
  body_preview: string;
  draft: boolean;
  /**
   * ISO 8601 format (e.g. "2026-01-04T10:00:00Z")
   */
  hidden_at: string | null;
  /**
   * 解決日時 (ISO 8601 format)
   * ※この値が存在する場合「解決済み」として扱う
   */
  solved_at: string | null;
  created_at: string;
  updated_at: string;
  /**
   * 退会済み、または削除されたユーザーの場合は null
   */
  author: Author | null;
  /**
   * 本人が自分の投稿一覧(?userId=自分)を見たときのみ意味を持つ審査状態(#179)。
   * 承認済み一覧やチェック未登録の既存データは "approved"。他人/公開一覧では常に "approved"。
   * additive: 未指定の可能性があるため optional。
   */
  review_status?: ReviewStatus;
  /**
   * 相談に紐づくタグ。相談一覧 GET /api/consultations は常に配列を返す(issue #193)。
   * 管理画面の投稿チェック一覧など、この型を共有しつつタグを返さない経路があるため optional。
   */
  tags?: ConsultationFormTag[];
}

/**
 * バックエンドの PaginationMeta と契約を統一
 * src: apps/fumufumu-backend/src/types/consultation.types.ts
 */
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ConsultationListResponse {
  pagination: PaginationMeta;
  data: Consultation[];
}

/**
 * 相談横断のアドバイス一覧レスポンス
 * src: apps/fumufumu-backend/src/types/advice.response.ts (AdviceListResponse)
 */
export interface AdviceListResponse {
  pagination: PaginationMeta;
  data: Advice[];
}

export interface Tag {
  id: number;
  name: string;
  sort_order: number;
  count: number;
}

export interface TagListResponse {
  data: Tag[];
}

export interface ConsultationFormTag {
  id: number;
  name: string;
}

export interface CreateConsultationParams {
  title: string;
  body: string;
  draft: boolean;
  tagIds?: number[];
}

/**
 * 相談更新(PUT /api/consultations/:id)のリクエスト。
 * tagIds の扱いに注意: 省略(undefined)で既存タグを保持、配列指定で総入れ替え(空配列は全削除)。
 * 公開(draft:false)にはタグが1件以上必要。
 */
export interface UpdateConsultationParams {
  title: string;
  body: string;
  draft: boolean;
  tagIds?: number[];
}

/**
 * 相談の作成/更新後に返る保存結果(全文は含まない)。
 * src: apps/fumufumu-backend/src/types/consultation.response.ts (ConsultationSavedResponse)
 */
export interface ConsultationSavedResponse {
  id: number;
  draft: boolean;
  updated_at: string;
}

export interface CreateAdviceParams {
  consultationId: number;
  body: string;
  draft: boolean;
}

/**
 * アドバイスの下書き更新後に返る保存結果(全文は含まない)。
 * 作成と異なり body/author を返さない点に注意。
 * src: apps/fumufumu-backend/src/types/consultation.response.ts (AdviceSavedResponse)
 */
export interface AdviceSavedResponse {
  id: number;
  draft: boolean;
  updated_at: string;
  created_at: string;
}

export interface Advice {
  id: number;
  /**
   * 所属する相談のID。
   * 相談スコープの取得API(相談詳細のadvices)ではURLから既知のため使わなくてよいが、
   * 相談横断のGET /api/advicesではモデレーション対象の判断に必須のため利用する。
   */
  consultation_id: number;
  body: string;
  draft: boolean;
  hidden_at: string | null;
  created_at: string;
  updated_at: string;
  author: Author | null;
  /**
   * 本人が自分のアドバイス一覧(?userId=自分)を見たときのみ意味を持つ審査状態(#179)。
   * 承認済み一覧やチェック未登録の既存データは "approved"。他人/公開一覧では常に "approved"。
   * additive: 未指定の可能性があるため optional。
   */
  review_status?: ReviewStatus;
}

/**
 * 詳細画面用の型
 * * 【設計メモ】
 * 一覧用データ（Consultation）と整合性を保つため、interfaceの継承を使用しています。
 * 詳細は docs/design/adr/001-frontend-type-definition-strategy.md を参照。
 */
export interface ConsultationDetail extends Consultation {
  /**
   * 相談の全文
   * ※API改修前は body_preview の内容が入る可能性があります
   */
  body: string;

  /**
   * アドバイス一覧
   * ※API改修前は空配列が入ります
   */
  advices: Advice[];

  /**
   * 相談に紐づくタグ。詳細取得では必ず付与され、タグ未設定なら空配列。
   * 詳細画面の表示と、下書き編集画面のプリロードに使う。
   */
  tags: ConsultationFormTag[];
}
