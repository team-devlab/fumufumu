"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { createConsultation } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";

const countCharacters = (text: string) => text.replace(/\s/g, '').length;

export const useConsultationEntry = () => {
  const router = useRouter();

  // フォームの状態
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
      toast.error("タイトルを入力してください");
      return;
    }

    if (!validateBody()) {
      toast.error(`下書き保存する場合も、相談内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上必要です`); // ★変更
      return;
    }

    setIsProcessing(true);
    try {
      await createConsultation({
        title,
        body,
        draft: true,
      });

      toast.success("下書きを保存しました");
      router.push("/consultations");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(`保存に失敗しました: ${error.message}`);
      } else {
        toast.error("保存に失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("タイトルと相談内容を入力してください"); // ★変更
      return;
    }
    
    if (!validateBody()) {
        toast.error(`相談内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上入力してください`); // ★変更
        return;
    }

    // ★開発中メッセージは info などで控えめに表示
    toast("確認画面機能は開発中です。\n入力内容は有効です。", {
        icon: '🚧',
    });
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
