"use client";

import { Button } from "@/components/ui/Button";
import {
  CONSULTATION_RULES,
} from "@/features/consultation/config/constants";
import { useAdviceEntry } from "@/features/consultation/hooks/useAdviceEntry";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceForm = ({ consultation }: Props) => {
  // フックを使用してロジックを分離
  const {
    body,
    setBody,
    isProcessing,
    handleBack,
    handleSaveDraft,
    handleConfirm,
  } = useAdviceEntry(consultation.id);

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
        <h1 className="text-xl font-bold text-gray-800">相談に回答する</h1>

        {/* --- 親相談のコンテキスト表示エリア --- */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
          <div className="border-b border-gray-200 pb-2 mb-2">
            <p className="text-xs text-gray-500 mb-1">
              以下の相談に対する回答を作成します
            </p>
            <h2 className="text-lg font-bold text-gray-800">
              {consultation.title}
            </h2>
          </div>
          <div className="text-sm text-gray-600 line-clamp-3">
            {consultation.body}
          </div>
        </div>

        {/* --- 入力フォームエリア --- */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label
              htmlFor="adviceBody"
              className="block text-md font-bold text-gray-800"
            >
              回答内容
            </label>
            <span className="text-sm text-gray-500 font-mono">
              {body.length} / {CONSULTATION_RULES.BODY_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="adviceBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="相談者へのアドバイスや回答を入力してください..."
            rows={10}
            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-y"
            maxLength={CONSULTATION_RULES.BODY_MAX_LENGTH}
          />
          <p className="text-xs text-gray-400 text-right">
            ※ {CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上入力してください
          </p>
        </div>

        {/* --- アクションボタンエリア --- */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          {/* 左側: キャンセル */}
          <button
            type="button"
            onClick={handleBack}
            disabled={isProcessing}
            className="px-6 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>

          {/* 右側: 保存・確認 */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isProcessing}
              className="px-6 py-3 font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              下書き保存
            </button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
            >
              確認画面へ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
