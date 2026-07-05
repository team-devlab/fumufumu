/**
 * アプリケーション内のルーティングパスを一元管理する定数
 */
export const ROUTES = {
  HOME: "/",
  USER: "/user",
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
  // アドバイス単体を対象とするルート。編集は相談横断で一意な adviceId で引き当てる
  // (同一相談に本人の複数下書きが併存し得るため consultationId では特定できない)。
  ADVICE: {
    DRAFT_EDIT: (adviceId: string | number) => `/advices/${adviceId}/edit`,
  },
} as const;
