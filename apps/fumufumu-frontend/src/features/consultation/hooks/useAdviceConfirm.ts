"use client";

import { useRouter } from "next/navigation";
import { useState } from "react"; // useEffect を削除
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
  // isComplete フラグも不要になったので削除

  // ▼ 削除: 自動リダイレクト処理 (useEffect) を削除
  // persist導入により、リロード時もデータが復元されるため、
  // ここで強制的に戻す必要がなくなりました。

  const handleBack = () => {
    router.back();
  };

  const handlePublish = async () => {
    // 最後の砦として、ボタンを押した瞬間にチェックする
    if (!body) {
      toast.error("入力内容が不足しています");
      router.replace(ROUTES.CONSULTATION.ADVICE.NEW(consultationId));
      return;
    }

    setIsProcessing(true);
    try {
      await createAdvice({
        consultationId,
        body,
        draft: false,
      });

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
