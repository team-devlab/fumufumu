export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: number;
  name: string;
  disabled: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * 退会プレビュー（確認画面の「◯件削除／◯件匿名化」表示用）。
 * バックエンドの GET /api/users/me/withdrawal-preview のレスポンスに対応する。
 */
export interface WithdrawalPreview {
  delete: { consultations: number; advices: number; total: number };
  anonymize: { consultations: number; advices: number; total: number };
}
