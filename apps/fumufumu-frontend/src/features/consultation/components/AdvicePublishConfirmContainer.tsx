"use client";

import { AdvicePublishConfirm } from "@/features/consultation/components/AdvicePublishConfirm";
import { useAdvicePublishConfirm } from "@/features/consultation/hooks/useAdvicePublishConfirm";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
  adviceId: number;
  initialBody: string;
};

export const AdvicePublishConfirmContainer = ({
  consultation,
  adviceId,
  initialBody,
}: Props) => {
  const {
    isReady,
    body,
    isProcessing,
    handleBack,
    handleSaveDraft,
    handlePublish,
  } = useAdvicePublishConfirm(adviceId, initialBody);

  // persist の rehydration 完了までは、未保存編集がある場合にサーバ値がちらつくのを避けて待つ
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
          公開内容の確認
        </h1>
      </header>
      <AdvicePublishConfirm
        consultation={consultation}
        body={body}
        isProcessing={isProcessing}
        onBack={handleBack}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />
    </div>
  );
};
