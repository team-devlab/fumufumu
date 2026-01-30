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

export interface ConsultationListResponse {
  meta: {
    total: number;
  };
  data: Consultation[];
}

export interface CreateConsultationParams {
  title: string;
  body: string;
  draft: boolean;
}

export interface Advice {
  id: number;
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
   * 回答一覧
   * ※API改修前は空配列が入ります
   */
  advices: Advice[];
}
