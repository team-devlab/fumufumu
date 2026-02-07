"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { createConsultation } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";
import { usePreventUnload } from "@/features/consultation/hooks/usePreventUnload";
import {
  useConsultationActions,
  useConsultationBody,
  useConsultationTitle,
  useHasInput,
} from "@/features/consultation/stores/useConsultationFormStore";

const countCharacters = (text: string) => text.replace(/\s/g, "").length;

export const useConsultationEntry = () => {
  const router = useRouter();

  // 個別のSelectorフックから値とアクションを取得
  // これにより、例えば tags が更新されても、このコンポーネントは再レンダリングされにくくなります
  const title = useConsultationTitle();
  const body = useConsultationBody();
  const { setTitle, setBody, reset } = useConsultationActions();
  const hasInput = useHasInput();

  const [isProcessing, setIsProcessing] = useState(false);

  // 有効文字数を計算
  const titleCharCount = countCharacters(title);
  const bodyCharCount = countCharacters(body);

  // NOTE: 誤操作による離脱防止
  const isDirty = hasInput && !isProcessing;
  usePreventUnload(isDirty);

  const handleBack = () => {
    if (isDirty) {
      const ok = window.confirm(
        "入力中の内容は保存されていません。一覧に戻りますか？",
      );
      if (!ok) return;
    }
    router.back();
  };

  const validateBody = () => {
    if (bodyCharCount < CONSULTATION_RULES.BODY_MIN_LENGTH) {
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
      toast.error(
        `下書き保存する場合も、相談内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上必要です`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      await createConsultation({
        title,
        body,
        draft: true,
      });

      // ADR 003: 投稿成功時にリセット
      reset();

      toast.success("下書きを保存しました");
      router.push(ROUTES.CONSULTATION.LIST);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(`保存に失敗しました: ${error.message}`);
      } else {
        toast.error("保存に失敗しました。時間をおいて再度お試しください。");
      }
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("タイトルと相談内容を入力してください");
      return;
    }

    if (!validateBody()) {
      toast.error(
        `相談内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上入力してください`,
      );
      return;
    }

    router.push(`${ROUTES.CONSULTATION.NEW}/confirm`);
  };

  return {
    title,
    setTitle,
    body,
    setBody,
    isProcessing,
    titleCharCount,
    bodyCharCount,
    handleSaveDraft,
    handleConfirm,
    handleBack,
  };
};
