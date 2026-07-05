"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { updateDraftAdvice } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";
import { usePreventUnload } from "@/features/consultation/hooks/usePreventUnload";
import { useSeededDraftEdit } from "@/features/consultation/hooks/useSeededDraftEdit";
import {
  useAdviceEditActions,
  useAdviceEditBody,
  useAdviceEditHasHydrated,
  useAdviceEditIsDirty,
  useEditingAdviceId,
} from "@/features/consultation/stores/useAdviceEditFormStore";

const countCharacters = (text: string) => text.replace(/\s/g, "").length;

/**
 * アドバイスの下書きを編集する entry 画面のロジック（ADR 012）。
 * サーバ取得した下書き本文を編集専用ストアに seed し、下書き保存(更新)を担う。
 * 更新対象は adviceId で一意に特定する。公開(C)は最終形で確認画面を挟むが本 PR では扱わない。
 */
export const useAdviceDraftEdit = (adviceId: number, initialBody: string) => {
  const router = useRouter();

  const body = useAdviceEditBody();
  const editingId = useEditingAdviceId();
  const hasHydrated = useAdviceEditHasHydrated();
  const isDirty = useAdviceEditIsDirty();
  const { setBody, hydrateForAdvice, reset } = useAdviceEditActions();

  const [isProcessing, setIsProcessing] = useState(false);

  // rehydration 完了後、別のアドバイスを開いた時だけサーバ値で seed する。
  // 送信中(isProcessing)は seed しない: 保存成功時の reset() 直後、遷移が完了するまでの間に
  // 古い prop で再 seed され、編集前の値に戻ってしまうのを防ぐため。
  useSeededDraftEdit({
    enabled: !isProcessing,
    hasHydrated,
    editingId,
    targetId: adviceId,
    seed: () => hydrateForAdvice({ adviceId, body: initialBody }),
  });

  // このストアが対象のアドバイスを保持している（seed 済み）か。フォーム描画のゲートに使う
  const isReady = hasHydrated && editingId === adviceId;

  const characterCount = countCharacters(body);

  // 未保存の変更があれば「更新/閉じる/戻る」で警告（作成フローと同じ機構）
  usePreventUnload(isDirty && !isProcessing);

  const validateBody = () =>
    characterCount >= CONSULTATION_RULES.BODY_MIN_LENGTH;

  const handleSaveDraft = async () => {
    if (!validateBody()) {
      toast.error(
        `下書き保存する場合も、内容は${CONSULTATION_RULES.BODY_MIN_LENGTH}文字以上必要です`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      await updateDraftAdvice(adviceId, body);

      reset();
      toast.success("下書きを保存しました");
      // 遷移先プロフィールの下書き一覧は Router Cache に古い RSC が残るため、
      // refresh でキャッシュを無効化して更新を反映させる(無いと一覧が古いまま)。
      router.push(ROUTES.USER);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました。時間をおいて再度お試しください。");
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (isDirty && !isProcessing) {
      const ok = window.confirm(
        "編集中の内容は保存されていません。ページを離れますか？",
      );
      if (!ok) return;
    }
    router.back();
  };

  return {
    isReady,
    body,
    setBody,
    isProcessing,
    characterCount,
    handleSaveDraft,
    handleBack,
  };
};
