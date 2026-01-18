"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsultationForm } from "@/features/consultation/components/ConsultationForm";
import { ConsultationFormActions } from "@/features/consultation/components/ConsultationFormActions";

export default function NewConsultationPage() {
  const router = useRouter();

  // フォームの状態管理
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // イベントハンドラ（仮実装）
  const handleBack = () => {
    router.back();
  };

  const handleSaveDraft = () => {
    setIsProcessing(true);
    console.log("下書き保存:", { title, body });
    setTimeout(() => setIsProcessing(false), 1000); // 処理シミュレーション
  };

  const handleConfirm = () => {
    // バリデーションなどは後ほど実装
    console.log("確認画面へ:", { title, body });
  };

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <ConsultationForm
        title={title}
        body={body}
        onChangeTitle={setTitle}
        onChangeBody={setBody}
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
