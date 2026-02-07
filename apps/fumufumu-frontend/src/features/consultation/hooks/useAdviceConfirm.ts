"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { createAdvice } from "@/features/consultation/api/consultationClientApi";
import {
  useAdviceActions,
  useAdviceBody,
} from "@/features/consultation/stores/useAdviceFormStore";

export const useAdviceConfirm = (consultationId: number) => {
  const router = useRouter();

  const body = useAdviceBody();
  const { reset } = useAdviceActions();

  const [isProcessing, setIsProcessing] = useState(false);
  // ▼ 追加: 投稿完了フラグ
  const [isComplete, setIsComplete] = useState(false);

  // 直接URLを叩いて確認画面に来た場合など、入力がないときは入力画面に戻す
  useEffect(() => {
    // ▼ 追加: 投稿完了してリセットされた場合は、リダイレクトしない（詳細画面への遷移を待つ）
    if (isComplete) return;

    if (!body) {
      router.replace(ROUTES.CONSULTATION.ADVICE.NEW(consultationId));
    }
  }, [body, consultationId, router, isComplete]); // ▼ 依存配列に追加

  const handleBack = () => {
    router.back();
  };

  const handlePublish = async () => {
    if (!body) return;

    setIsProcessing(true);
    try {
      await createAdvice({
        consultationId,
        body,
        draft: false,
      });

      // ▼ 追加: リセット前に完了フラグを立てる
      setIsComplete(true);
      
      reset();
      
      toast.success("回答を投稿しました！");
      router.push(ROUTES.CONSULTATION.DETAIL(consultationId));
    } catch (error) {
      console.error(error);
      toast.error("投稿に失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    body,
    isProcessing,
    handleBack,
    handlePublish,
  };
};
