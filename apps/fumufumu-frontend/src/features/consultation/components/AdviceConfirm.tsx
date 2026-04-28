"use client";

import { Button } from "@/components/ui/Button";
import { useAdviceConfirm } from "@/features/consultation/hooks/useAdviceConfirm";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceConfirm = ({ consultation }: Props) => {
  const { body, isProcessing, handleBack, handlePublish } = useAdviceConfirm(
    consultation.id,
  );

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
      {/* --- 親相談のコンテキスト表示 --- */}
      <div className="space-y-2">
        <span className="block text-xs text-gray-400">
          以下の相談に対するアドバイスを投稿します
        </span>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-base font-semibold text-gray-700">
            {consultation.title}
          </h2>
          <div className="text-sm text-gray-600 line-clamp-3">
            {consultation.body}
          </div>
        </div>
      </div>

      {/* --- アドバイス本文 --- */}
      <div className="space-y-2">
        <span className="block text-base font-semibold text-gray-700">
          アドバイス内容
        </span>
        <div className="text-xl font-bold text-gray-800 whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
      </div>

      {/* --- アクションボタン --- */}
      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={isProcessing}
          className="px-6 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ← 修正する
        </button>

        <Button
          onClick={handlePublish}
          disabled={isProcessing}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
        >
          {isProcessing ? "送信中..." : "アドバイスを投稿する"}
        </Button>
      </div>
    </div>
  );
};
