import React from "react";
import { Consultation } from "../types";

type Props = {
  consultation: Consultation;
};

export const ConsultationItem: React.FC<Props> = ({ consultation }) => {
  const timeAgo = "2時間前"; // ここは一旦固定のまま（別途日付ライブラリで created_at から計算推奨）
  
  // Backendには status フィールドがないため、solved_at の有無で判定
  const isResolved = !!consultation.solved_at;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header: User Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-gray-700">
              {consultation.author?.name ?? "退会済みユーザー"}
            </span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
        </div>
        
        {/* Status Badge: solved_at があれば解決済み */}
        {isResolved && (
          <span className="bg-teal-600 text-white text-xs px-3 py-1 rounded-full font-medium">
            解決済み
          </span>
        )}
      </div>

      {/* Body */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          {consultation.title}
        </h3>
        {/* body ではなく body_preview を表示 */}
        <p className="text-gray-600 text-sm leading-relaxed">
          {consultation.body_preview}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
           <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
             キャリア
           </span>
        </div>
        
        {/* コメント数などはBackendレスポンスに含まれていないため、一旦非表示または仮置き */}
        {/* 必要であればConsultationResponseにcomment_countを追加するようBackendに依頼する */}
      </div>
    </div>
  );
};
