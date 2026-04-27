"use client";

import { ConsultationConfirm } from "@/features/consultation/components/ConsultationConfirm";
import { useConsultationConfirm } from "@/features/consultation/hooks/useConsultationConfirm";

export const ConsultationConfirmContainer = () => {
  const {
    title,
    body,
    tags,
    isProcessing,
    handleBack,
    handleSaveDraft,
    handlePublish,
  } = useConsultationConfirm();

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          投稿内容確認
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
