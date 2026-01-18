"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createConsultation } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";

const countCharacters = (text: string) => text.replace(/\s/g, '').length;

export const useConsultationEntry = () => {
  const router = useRouter();

  // フォーム状態
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // 処理状態
  const [isProcessing, setIsProcessing] = useState(false);

  const validateBody = () => {
     if (countCharacters(body) < CONSULTATION_RULES.BODY_MIN_LENGTH) {
        return false;
     }
     return true;
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    if (!validateBody()) {
       alert(`下書き保存する場合も、相談内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上必要です`);
       return;
    }

    setIsProcessing(true);
    try {
      await createConsultation({
        title,
        body,
        draft: true,
      });

      alert("下書きを保存しました");
      router.push("/consultations");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        alert(`保存に失敗しました: ${error.message}`);
      } else {
        alert("保存に失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!title.trim() || !body.trim()) {
      alert("タイトルと相談内容を入力してください");
      return;
    }
    
    if (!validateBody()) {
        alert(`相談内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上入力してください`);
        return;
    }

    alert("確認画面機能は開発中です。\n\n入力内容は有効です。");
  };

  return {
    title,
    setTitle,
    body,
    setBody,
    isProcessing,
    handleSaveDraft,
    handleConfirm,
  };
};
