"use client";

import { ConsultationForm } from "@/features/consultation/components/ConsultationForm";
import { ConsultationFormActions } from "@/features/consultation/components/ConsultationFormActions";
import { useConsultationEntry } from "@/features/consultation/hooks/useConsultationEntry";

export const ConsultationNewContainer = () => {
  // カスタムフックからステートとロジックを取得
  const {
    title,
    setTitle,
    body,
    setBody,
    tags,
    availableTags,
    isLoadingTags,
    isProcessing,
    titleCharCount,
    bodyCharCount,
    handleSaveDraft,
    handleToggleTag,
    handleConfirm,
    handleBack,
  } = useConsultationEntry();

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <ConsultationForm
        title={title}
        body={body}
        tags={tags}
        availableTags={availableTags}
        isLoadingTags={isLoadingTags}
        onChangeTitle={setTitle}
        onChangeBody={setBody}
        onToggleTag={handleToggleTag}
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
};
