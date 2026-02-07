"use client";

import { ConsultationForm } from "@/features/consultation/components/ConsultationForm";
import { ConsultationFormActions } from "@/features/consultation/components/ConsultationFormActions";
import { useConsultationEntry } from "@/features/consultation/hooks/useConsultationEntry";

export default function NewConsultationPage() {
  // カスタムフックからステートとロジックを取得
  const {
    title,
    setTitle,
    body,
    setBody,
    isProcessing,
    titleCharCount,
    bodyCharCount,
    handleSaveDraft,
    handleConfirm,
    handleBack,
  } = useConsultationEntry();

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <ConsultationForm
        title={title}
        body={body}
        onChangeTitle={setTitle}
        onChangeBody={setBody}
        titleCharCount={titleCharCount}
        bodyCharCount={bodyCharCount}
      />
      <ConsultationFormActions
        onBack={handleBack}
        onSaveDraft={handleSaveDraft}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
