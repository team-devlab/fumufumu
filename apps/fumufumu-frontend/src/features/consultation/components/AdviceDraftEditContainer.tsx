"use client";

import { AdviceDraftEditForm } from "@/features/consultation/components/AdviceDraftEditForm";
import { useAdviceDraftEdit } from "@/features/consultation/hooks/useAdviceDraftEdit";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
  adviceId: number;
  initialBody: string;
};

export const AdviceDraftEditContainer = ({
  consultation,
  adviceId,
  initialBody,
}: Props) => {
  const {
    isReady,
    body,
    setBody,
    isProcessing,
    characterCount,
    handleSaveDraft,
    handleBack,
  } = useAdviceDraftEdit(adviceId, initialBody);

  // persist の rehydration 完了 + サーバ値の seed 完了までは、空フォームのちらつきを避けて待つ
  if (!isReady) {
    return (
      <div className="max-w-4xl mx-auto w-full py-20 text-center">
        <p aria-live="polite" className="text-gray-500 text-sm">
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-700">
          アドバイスを編集
        </h1>
      </header>

      <AdviceDraftEditForm
        consultation={consultation}
        body={body}
        onChangeBody={setBody}
        characterCount={characterCount}
        isProcessing={isProcessing}
        onBack={handleBack}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
};
