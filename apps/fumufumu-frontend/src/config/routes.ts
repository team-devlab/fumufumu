/**
 * アプリケーション内のルーティングパスを一元管理する定数
 */
export const ROUTES = {
  HOME: "/",
  CONSULTATION: {
    LIST: "/consultations",
    NEW: "/consultations/new",
    DETAIL: (id: string | number) => `/consultations/${id}`,
  },
} as const;
