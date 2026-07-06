"use client";

import { Button } from "@/components/ui/Button";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
  body: string;
  onChangeBody: (body: string) => void;
  characterCount: number;
  isProcessing: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
};

/**
 * アドバイス下書きの編集フォーム（本文のみ）。
 * 作成フォーム(AdviceForm)は useAdviceEntry と密結合のため流用せず、
 * 編集専用の presentational を新設して作成フローへの回帰を避ける。
 * 公開(C)は最終形で確認画面を挟むが、本 PR では「下書きを更新」のみ。
 */
export const AdviceDraftEditForm = ({
  consultation,
  body,
  onChangeBody,
  characterCount,
  isProcessing,
  onBack,
  onSaveDraft,
}: Props) => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
      {/* --- 親相談のコンテキスト表示エリア --- */}
      <div className="space-y-2">
        <span className="block text-xs text-gray-400">
          以下の相談へのアドバイス下書きを編集します
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

      {/* --- 入力フォームエリア --- */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="adviceBody"
            className="block text-base font-semibold text-gray-700"
          >
            アドバイス内容
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {characterCount} / {CONSULTATION_RULES.BODY_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="adviceBody"
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          placeholder="相談者へのアドバイスを入力してください..."
          rows={10}
          className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-y"
          maxLength={CONSULTATION_RULES.BODY_MAX_LENGTH}
        />
        <p className="text-xs text-gray-400 text-right">
          ※ {CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上入力してください
        </p>
      </div>

      {/* --- アクションボタンエリア --- */}
      <div className="flex items-center justify-between pt-6">
        {/* 左側: キャンセル */}
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          キャンセル
        </button>

        {/* 右側: 下書きを更新 */}
        <Button
          onClick={onSaveDraft}
          disabled={isProcessing}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
        >
          下書きを更新
        </Button>
      </div>
    </div>
  );
};
