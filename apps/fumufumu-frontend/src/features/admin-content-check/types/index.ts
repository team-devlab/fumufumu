/**
 * Admin 投稿チェック関連の型定義
 *
 * バックエンドの真実は `apps/fumufumu-backend/src/services/consultation-content-check.service.ts`
 * および `apps/fumufumu-backend/src/db/schema/content-checks.ts` に定義されている。
 * 本 file は frontend で必要な分のみを mirror する。
 * source 側の変更時は本 file も追従させること。
 */

/**
 * 投稿チェックステータス。本一覧 view では "pending" だけが現れる想定だが、
 * バックエンドの enum をそのまま受けられるよう全値を残す。
 */
export type ContentCheckStatus = "pending" | "approved" | "rejected";

// ============================================
// 相談 (consultation) の投稿チェック
// ============================================

/** `?view=summary` のレスポンス要素 */
export interface PendingConsultationSummary {
  id: number;
  status: ContentCheckStatus;
  created_at: string;
}

export interface PendingConsultationListResponse {
  consultations: PendingConsultationSummary[];
}

/** `?view=detail` のレスポンス要素 */
export interface PendingConsultationDetail {
  id: number;
  title: string;
  body: string;
  author_id: number | null;
  status: ContentCheckStatus;
  created_at: string;
}

export interface PendingConsultationDetailResponse {
  consultations: PendingConsultationDetail[];
  missing_ids: number[];
  non_pending: Array<{ id: number; current_status: string }>;
}

// ============================================
// アドバイス (advice) の投稿チェック
// ============================================

/** `?view=summary` のレスポンス要素 */
export interface PendingAdviceSummary {
  id: number;
  consultation_id: number;
  status: ContentCheckStatus;
  created_at: string;
}

export interface PendingAdviceListResponse {
  advices: PendingAdviceSummary[];
}

/** `?view=detail` のレスポンス要素 */
export interface PendingAdviceDetail {
  id: number;
  consultation_id: number;
  body: string;
  author_id: number | null;
  status: ContentCheckStatus;
  created_at: string;
}

export interface PendingAdviceDetailResponse {
  advices: PendingAdviceDetail[];
  missing_ids: number[];
  non_pending: Array<{ id: number; current_status: string }>;
}

// ============================================
// モデレーション (hide/unhide, ADR 011)
// ============================================

/** URL path 用の複数形。バックエンドの `moderationTargetParamSchema` と一致させる */
export type ModerationTargetType = "consultations" | "advices";

/** hide/unhide 実行結果 */
export interface ModerationActionResponse {
  target_type: "consultation" | "advice";
  target_id: number;
  hidden_at: string | null;
}

/**
 * バッチ理由取得 (GET /:targetType/hide-reasons) のレスポンス。
 * target_id (文字列キー) -> 現在の非表示理由 (理由なし/履歴なしは null)。
 */
export interface HideReasonsResponse {
  reasons: Record<string, string | null>;
}
