export interface Author {
  id: number;
  name: string;
  disabled: boolean;
}

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
   * 相談に紐づくタグ（下書き編集画面でのプリロード用）。
   * 詳細取得時のみ付与され、タグ未設定なら空配列。
   */
  tags: ConsultationFormTag[];
}
