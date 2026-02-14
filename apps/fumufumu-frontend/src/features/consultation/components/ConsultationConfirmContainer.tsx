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
