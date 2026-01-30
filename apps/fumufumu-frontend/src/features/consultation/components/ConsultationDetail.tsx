import React from "react";
import { fetchConsultationDetailApi } from "../api/consultationApi";
import { ConsultationDetail as ConsultationDetailType } from "../types";

type Props = {
  consultationId: string;
};

/**
 * 相談詳細を表示する Server Component
 */
export const ConsultationDetail = async ({ consultationId }: Props) => {
  let consultation: ConsultationDetailType | null = null;
  let error: string | null = null;

  try {
    // Server Sideで直接データを取得
    consultation = await fetchConsultationDetailApi(consultationId);
  } catch (e) {
    console.error(e);
    error = "相談データの取得に失敗しました。";
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!consultation) {
    return <div className="p-8 text-center">データが見つかりません</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">データ取得確認 (Server Component)</h1>

      {/* デバッグ用: 生データの表示 */}
      <div className="bg-gray-100 p-4 rounded mb-8 overflow-auto border border-gray-200">
        <pre className="text-xs">{JSON.stringify(consultation, null, 2)}</pre>
      </div>

      {/* 簡易プレビューUI */}
      <div className="border p-6 rounded-lg shadow-sm bg-white">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{consultation.title}</h2>
        
        <div className="flex gap-4 text-sm text-gray-500 mb-6 border-b pb-4">
          <span>Author ID: {consultation.author?.id}</span>
          <span>Updated: {new Date(consultation.updated_at).toLocaleDateString()}</span>
        </div>

        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {consultation.body}
        </div>
      </div>
    </div>
  );
};
