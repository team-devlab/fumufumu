"use client";

import { ConsultationForm } from "@/features/consultation/components/ConsultationForm";
import { useConsultationEntry } from "@/features/consultation/hooks/useConsultationEntry";
import type { Tag } from "@/features/consultation/types";

type Props = {
  availableTags: Tag[];
};

export const ConsultationNewContainer = ({ availableTags }: Props) => {
  // カスタムフックからステートとロジックを取得
  const {
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
  } = useConsultationEntry(availableTags);

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          相談投稿
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
