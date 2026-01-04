/**
 * 投稿者情報 (Author)
 */
export interface Author {
  id: number; // Backend実装の authorId: number から推測
  name: string;
  disabled: boolean;
}

/**
 * 相談 (Consultation) - APIレスポンス形式
 */
export interface Consultation {
  id: number; // DBのID型に合わせる（通常SQLならnumberが多いですが、Backendの実装依存。一旦numberとします）
  title: string;
  body_preview: string; // 一覧用はプレビューのみ
  draft: boolean;
  hidden_at: string | null; // ISO String
  solved_at: string | null; // これが入っていれば「解決済み」
  created_at: string;
  updated_at: string;
  author: Author | null;
}

/**
 * 一覧取得時のAPIレスポンス構造
 */
export interface ConsultationListResponse {
  meta: {
    total: number;
  };
  data: Consultation[];
}