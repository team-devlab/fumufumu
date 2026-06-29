"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { createAdvice } from "@/features/consultation/api/consultationClientApi";
import {
  useAdviceActions,
  useAdviceBody,
} from "@/features/consultation/stores/useAdviceFormStore";

// NOTE: ここで「データがない場合のリダイレクト(useEffect)」を行わない理由
// Zustandのpersistによるデータ復元(Hydration)は非同期的に行われるため、
// リロード直後の一瞬は body が空の状態になります。
// ここでリダイレクトさせると、データ復元前に強制遷移されてしまうため、
// あえて自動リダイレクトは実装せず、送信ボタン押下時にチェックしています。

export const useAdviceConfirm = (consultationId: number) => {
  const router = useRouter();

  const body = useAdviceBody();
  const { reset } = useAdviceActions();

  const [isProcessing, setIsProcessing] = useState(false);

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

      // 投稿直後は content_check が pending のため一般画面には表示されない。
      // ADR 007 の導線に従い、author 自身が投稿状況を確認できるプロフィールへ遷移する。
      toast.success("投稿チェック中です。承認後に表示されます。");
      router.push(ROUTES.USER);
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
