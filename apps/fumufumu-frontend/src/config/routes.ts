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
    ADVICE: {
      NEW: (id: string | number) => `/consultations/${id}/advice/new`,
      CONFIRM: (id: string | number) =>
        `/consultations/${id}/advice/new/confirm`,
    },
  },
} as const;
