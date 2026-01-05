import "server-only";
import type {
  Consultation,
  ConsultationListResponse,
} from "@/features/consultation/types";

// Backendの形式に合わせたモックデータ
const MOCK_DATA: Consultation[] = [
  {
    id: 1,
    title: "相談：転職活動でのポートフォリオ作成のコツは？",
    body_preview:
      "現在3年目のエンジニアですが、今後のキャリアパスについて迷っています。技術を極めるべきか...",
    draft: false,
    hidden_at: null,
    solved_at: null, // null = 受付中
    created_at: "2026-01-04T10:00:00Z",
    updated_at: "2026-01-04T10:00:00Z",
    author: {
      id: 3,
      name: "ユーザー名3",
      disabled: false,
    },
  },
  {
    id: 2,
    title: "相談：フロントエンド技術の学習順序について教えてください",
    body_preview:
      "現在3年目のエンジニアですが、今後のキャリアパスについて迷っています...",
    draft: false,
    hidden_at: null,
    solved_at: "2026-01-04T12:00:00Z", // 日付あり = 解決済み
    created_at: "2026-01-04T08:00:00Z",
    updated_at: "2026-01-04T12:00:00Z",
    author: {
      id: 2,
      name: "ユーザー名2",
      disabled: false,
    },
  },
  {
    id: 3,
    title: "相談：エンジニアとしてのキャリアについて悩んでいます",
    body_preview:
      "現在3年目のエンジニアですが、今後のキャリアパスについて迷っています...",
    draft: false,
    hidden_at: null,
    solved_at: null,
    created_at: "2026-01-04T09:00:00Z",
    updated_at: "2026-01-04T09:00:00Z",
    author: {
      id: 1,
      name: "ユーザー名1",
      disabled: false,
    },
  },
];

export const fetchConsultationsMock =
  async (): Promise<ConsultationListResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          meta: {
            total: MOCK_DATA.length,
          },
          data: MOCK_DATA,
        });
      }, 1000);
    });
  };
