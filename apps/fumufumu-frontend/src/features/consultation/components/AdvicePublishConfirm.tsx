"use client";

import { Button } from "@/components/ui/Button";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
  body: string;
  isProcessing: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

/**
 * アドバイス公開の確認画面(本文のみ)。
 * 作成の AdviceConfirm は useAdviceConfirm と密結合のため流用せず、公開確認専用の presentational を
 * 新設して作成フローへの回帰を避ける(B の AdviceDraftEditForm と同方針)。
 * A の相談確認画面に揃え、確認画面からも「下書き保存」と「公開」の両方を行える。
 */
export const AdvicePublishConfirm = ({
  consultation,
  body,
  isProcessing,
  onBack,
  onSaveDraft,
  onPublish,
}: Props) => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
      {/* --- 親相談のコンテキスト表示 --- */}
      <div className="space-y-2">
        <span className="block text-xs text-gray-400">
          以下の相談へのアドバイスを公開します
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
        <div className="text-lg text-gray-800 whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
      </div>

      {/* --- アクションボタン --- */}
      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ← 修正する
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isProcessing}
            className="px-6 py-3 text-teal-700 border border-teal-600 rounded-xl font-bold hover:bg-teal-50 transition-colors disabled:opacity-50"
          >
            下書き保存
          </button>
          <Button
            onClick={onPublish}
            disabled={isProcessing}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
          >
            {isProcessing ? "送信中..." : "公開する"}
          </Button>
        </div>
      </div>
    </div>
  );
};
