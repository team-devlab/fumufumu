"use client";

import { AdvicePublishConfirm } from "@/features/consultation/components/AdvicePublishConfirm";
import { useAdvicePublishConfirm } from "@/features/consultation/hooks/useAdvicePublishConfirm";
import type { ConsultationDetail } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
  adviceId: number;
};

export const AdvicePublishConfirmContainer = ({
  consultation,
  adviceId,
}: Props) => {
  const { body, isProcessing, handleBack, handleSaveDraft, handlePublish } =
    useAdvicePublishConfirm(adviceId);

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
