import { CONSULTATION_LABELS } from "@/features/consultation/config/constants";
import type { ConsultationDetail } from "../types";

type Props = {
  consultation: ConsultationDetail;
};

export const ConsultationQuestionCard = ({ consultation }: Props) => {
  // TODO: アプリ全体で日付フォーマット処理を統一する（例: date-fnsの導入など）。現在は暫定的にtoLocaleStringを使用。
  const formattedDate = new Date(consultation.created_at).toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    // 一覧画面 (ConsultationItem) と同じスタイルベースを使用
    <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-sm">
      {/* ヘッダーエリア */}
      <div className="flex items-center mb-6">
        {/* アイコン: Teal系の背景色 */}
        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mr-4">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="ユーザーアイコン"
          >
            <title>ユーザーアイコン</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>

        <div>
          <div className="font-bold text-gray-800 text-lg">
            {consultation.author?.name ?? CONSULTATION_LABELS.ANONYMOUS_USER}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{formattedDate}</div>
        </div>
      </div>

      {/* タイトル */}
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 leading-tight">
        {consultation.title}
      </h1>

      {/* 本文 */}
      <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed mb-8">
        {consultation.body}
      </div>

      {/* タグ (今回は仮置き) */}
      <div className="flex gap-2">
        {/* TODO: タグ機能はバックエンド未実装のため、仮の静的値を表示 */}
        <span className="px-3 py-1 bg-teal-600 text-white text-sm font-medium rounded-full">
          #React
        </span>
      </div>
    </div>
  );
};
