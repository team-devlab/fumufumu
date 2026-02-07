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
    <div className="max-w-4xl mx-auto w-full pb-20">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
        <h1 className="text-xl font-bold text-gray-800 bg-gray-100 inline-block px-3 py-1 rounded-md">
          回答内容確認
        </h1>

        {/* --- 親相談のコンテキスト表示 --- */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-2">
          <p className="text-xs text-gray-500">
            以下の相談に対する回答を投稿します
          </p>
          <h2 className="text-lg font-bold text-gray-800">
            {consultation.title}
          </h2>
        </div>

        {/* --- 回答内容確認 --- */}
        <div className="space-y-2">
          <span className="block text-lg font-bold text-gray-800">
            回答内容
          </span>
          <div className="p-6 bg-white border border-gray-200 rounded-lg text-gray-700 whitespace-pre-wrap leading-relaxed">
            {body}
          </div>
        </div>

        {/* --- アクションボタン --- */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
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
            {isProcessing ? "送信中..." : "回答を投稿する"}
          </Button>
        </div>
      </div>
    </div>
  );
};
