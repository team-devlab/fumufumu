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
 * 退会プレビュー（確認画面の件数明示用）。バックエンドの GET /api/users/me/withdrawal-preview に対応する。
 * プロフィールのタブ（相談/アドバイス/下書き）に合わせた内訳。下書きは常に削除されるため anonymize は持たない。
 */
export interface WithdrawalPreview {
  consultations: { delete: number; anonymize: number };
  advices: { delete: number; anonymize: number };
  drafts: { delete: number };
}
