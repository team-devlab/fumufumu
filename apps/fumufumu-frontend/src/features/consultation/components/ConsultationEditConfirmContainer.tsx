"use client";

import { ConsultationConfirm } from "@/features/consultation/components/ConsultationConfirm";
import { useConsultationEditConfirm } from "@/features/consultation/hooks/useConsultationEditConfirm";

type Props = {
  consultationId: number;
};

export const ConsultationEditConfirmContainer = ({ consultationId }: Props) => {
  const {
    title,
    body,
    tags,
    isProcessing,
    handleBack,
    handleSaveDraft,
    handlePublish,
  } = useConsultationEditConfirm(consultationId);

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-700">
          編集内容の確認
        </h1>
      </header>
      <ConsultationConfirm
        title={title}
        body={body}
        tags={tags}
        onBack={handleBack}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        isProcessing={isProcessing}
      />
    </div>
  );
};
