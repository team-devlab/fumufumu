"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { createAdvice } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";
import { usePreventUnload } from "@/features/consultation/hooks/usePreventUnload";
import {
  useAdviceActions,
  useAdviceBody,
  useAdviceHasInput,
} from "@/features/consultation/stores/useAdviceFormStore";

const countCharacters = (text: string) => text.replace(/\s/g, "").length;

export const useAdviceEntry = (consultationId: number) => {
  const router = useRouter();

  const body = useAdviceBody();
  const { setBody, reset } = useAdviceActions();
  const hasInput = useAdviceHasInput();

  const [isProcessing, setIsProcessing] = useState(false);

  // 現在の有効文字数を計算
  const characterCount = countCharacters(body);

  // 誤操作による離脱防止
  const isDirty = hasInput && !isProcessing;
  usePreventUnload(isDirty);

  const handleBack = () => {
    if (isDirty) {
      const ok = window.confirm(
        "入力中の内容は保存されていません。前の画面に戻りますか？",
      );
      if (!ok) return;
    }
    router.back();
  };

  const validateBody = () => {
    if (characterCount < CONSULTATION_RULES.BODY_MIN_LENGTH) {
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateBody()) {
      toast.error(
        `下書き保存する場合も、内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上必要です`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      await createAdvice({
        consultationId,
        body,
        draft: true,
      });

      reset(); // 成功したらフォームをクリア
      toast.success("下書きを保存しました");
      
      // 下書き保存後は親の相談詳細画面に戻る(ユーザー画面ができたら、下書き一覧にいくのがいいかもしれない)
      router.push(ROUTES.CONSULTATION.DETAIL(consultationId));
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました。");
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!validateBody()) {
      toast.error(
        `内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上入力してください`,
      );
      return;
    }
    
    // 確認画面へ遷移
    router.push(ROUTES.CONSULTATION.ADVICE.CONFIRM(consultationId));
  };

  return {
    body,
    setBody,
    isProcessing,
    characterCount,
    handleBack,
    handleSaveDraft,
    handleConfirm,
  };
};
