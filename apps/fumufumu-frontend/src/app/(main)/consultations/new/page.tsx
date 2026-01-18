"use client";

import { useRouter } from "next/navigation";
import { ConsultationForm } from "@/features/consultation/components/ConsultationForm";
import { ConsultationFormActions } from "@/features/consultation/components/ConsultationFormActions";
import { useConsultationEntry } from "@/features/consultation/hooks/useConsultationEntry";

export default function NewConsultationPage() {
  const router = useRouter();

  // カスタムフックからステートとロジックを取得
  const {
    title,
    setTitle,
    body,
    setBody,
    isProcessing,
    handleSaveDraft,
    handleConfirm,
  } = useConsultationEntry();

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <ConsultationForm
        title={title}
        body={body}
        onChangeTitle={setTitle}
        onChangeBody={setBody}
      />
      <ConsultationFormActions
        onBack={() => router.back()}
        onSaveDraft={handleSaveDraft}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
}
