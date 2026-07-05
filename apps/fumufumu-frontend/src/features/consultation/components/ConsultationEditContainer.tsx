"use client";

import { ConsultationForm } from "@/features/consultation/components/ConsultationForm";
import { useConsultationEdit } from "@/features/consultation/hooks/useConsultationEdit";
import type { ConsultationDetail, Tag } from "@/features/consultation/types";

type Props = {
  consultation: ConsultationDetail;
  availableTags: Tag[];
};

export const ConsultationEditContainer = ({
  consultation,
  availableTags,
}: Props) => {
  const {
    isReady,
    title,
    setTitle,
    body,
    setBody,
    tags,
    isProcessing,
    titleCharCount,
    bodyCharCount,
    handleSaveDraft,
    handleToggleTag,
    handleConfirm,
    handleBack,
  } = useConsultationEdit(consultation, availableTags);

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
          相談を編集
        </h1>
      </header>

      <ConsultationForm
        title={title}
        body={body}
        tags={tags}
        availableTags={availableTags}
        onChangeTitle={setTitle}
        onChangeBody={setBody}
        onToggleTag={handleToggleTag}
        titleCharCount={titleCharCount}
        bodyCharCount={bodyCharCount}
        onBack={handleBack}
        onSaveDraft={handleSaveDraft}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
};
