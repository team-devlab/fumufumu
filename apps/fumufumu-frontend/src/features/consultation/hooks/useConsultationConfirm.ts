"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { createConsultation } from "@/features/consultation/api/consultationClientApi";
import {
  useConsultationActions,
  useConsultationBody,
  useConsultationTags,
  useConsultationTitle,
} from "@/features/consultation/stores/useConsultationFormStore";

export const useConsultationConfirm = () => {
  const router = useRouter();

  const title = useConsultationTitle();
  const body = useConsultationBody();
  const tags = useConsultationTags();
  const { reset } = useConsultationActions();

  const [isProcessing, setIsProcessing] = useState(false);

  // 共通の保存処理
  const submitConsultation = async (draft: boolean) => {
    if (!title || !body) {
      toast.error("入力内容が不足しています");
      router.push(ROUTES.CONSULTATION.NEW);
      return;
    }

    setIsProcessing(true);
    try {
      await createConsultation({
        title,
        body,
        draft,
        // tags: tags // APIがタグ対応したらここを開放
      });

      // ADR 003: 投稿成功時にリセット
      reset();

      toast.success(draft ? "下書きを保存しました" : "相談を投稿しました！");
      router.push(ROUTES.CONSULTATION.LIST);
    } catch (error) {
      console.error(error);
      toast.error("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    title,
    body,
    tags,
    isProcessing,
    handleBack: () => router.back(), // ブラウザバックで前のページに戻る（データは維持される）
    handleSaveDraft: () => submitConsultation(true),
    handlePublish: () => submitConsultation(false),
  };
};
