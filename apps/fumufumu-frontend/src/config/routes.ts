/**
 * アプリケーション内のルーティングパスを一元管理する定数
 */
export const ROUTES = {
  HOME: "/",
  USER: "/user",
  USER_WITHDRAWAL: "/user/withdrawal",
  CONSULTATION: {
    LIST: "/consultations",
    NEW: "/consultations/new",
    DETAIL: (id: string | number) => `/consultations/${id}`,
    EDIT: (id: string | number) => `/consultations/${id}/edit`,
    EDIT_CONFIRM: (id: string | number) => `/consultations/${id}/edit/confirm`,
    ADVICE: {
      NEW: (id: string | number) => `/consultations/${id}/advice/new`,
      CONFIRM: (id: string | number) =>
        `/consultations/${id}/advice/new/confirm`,
    },
  },
  // アドバイス単体を対象とするルート。編集は adviceId で一意特定する(経緯は ADR 012)。
  ADVICE: {
    DRAFT_EDIT: (adviceId: string | number) => `/advices/${adviceId}/edit`,
    DRAFT_EDIT_CONFIRM: (adviceId: string | number) =>
      `/advices/${adviceId}/edit/confirm`,
  },
} as const;
