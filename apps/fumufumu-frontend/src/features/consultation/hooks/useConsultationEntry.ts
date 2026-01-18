"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createConsultation } from "@/features/consultation/api/consultationClientApi";

export const useConsultationEntry = () => {
  const router = useRouter();

  // フォームの状態
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // 処理状態
  const [isProcessing, setIsProcessing] = useState(false);

  // 下書き保存処理
  const handleSaveDraft = async () => {
    // タイトル必須チェック
    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    // 本文も空だとエラーになるため、簡易チェック（バックエンドは10文字以上）
    if (body.replace(/\s/g, '').length < 10) {
       alert("下書き保存する場合も、相談内容は10文字以上必要です");
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
      // ★修正: バックエンドからのエラーメッセージを表示するように変更
      if (error instanceof Error) {
        alert(`保存に失敗しました: ${error.message}`);
      } else {
        alert("保存に失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 確認画面へ遷移処理
  const handleConfirm = () => {
    if (!title.trim() || !body.trim()) {
      alert("タイトルと相談内容を入力してください");
      return;
    }
    
    // バリデーション（文字数など）
    if (body.length < 10) {
        alert("相談内容は10文字以上入力してください");
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
