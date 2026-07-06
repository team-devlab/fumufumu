"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import {
  publishAdvice,
  updateDraftAdvice,
} from "@/features/consultation/api/consultationClientApi";
import {
  useAdviceEditActions,
  useAdviceEditBody,
  useEditingAdviceId,
} from "@/features/consultation/stores/useAdviceEditFormStore";

// NOTE: A の useConsultationEditConfirm と同型。データが無い場合の自動リダイレクト(useEffect)は
// 行わない。persist の rehydration は非同期で、リロード直後は一瞬空になるため、自動遷移させると
// 復元前に飛ばされる。送信ボタン押下時に検証して、誤爆(別/空のアドバイスへの公開)を防ぐ。
export const useAdvicePublishConfirm = (adviceId: number) => {
  const router = useRouter();

  const body = useAdviceEditBody();
  const editingId = useEditingAdviceId();
  const { reset } = useAdviceEditActions();

  const [isProcessing, setIsProcessing] = useState(false);

  const submit = async (draft: boolean) => {
    // ストアがこのアドバイスの編集内容を保持していない場合(直リンク/リロード直後/別アドバイス保持)は、
    // 誤ったアドバイスへの公開・保存を防ぐため編集画面へ戻す。編集画面側で本人下書きの認可(404)も行う。
    if (editingId !== adviceId || !body.trim()) {
      toast.error("編集内容が見つかりません。もう一度お試しください。");
      router.replace(ROUTES.ADVICE.DRAFT_EDIT(adviceId));
      return;
    }

    setIsProcessing(true);
    try {
      // 下書き保存は draft 維持(/draft)、公開は draft:false 化(/publish)。本文の最小長は
      // entry で検証済み。ここをすり抜けた場合も backend が 400/404 で拒否する(fail-closed)。
      if (draft) {
        await updateDraftAdvice(adviceId, body);
      } else {
        await publishAdvice(adviceId, body);
      }

      // 成功時は編集ストアを破棄する(次に別の下書きを開いた時に再 seed させる)
      reset();

      // ADR 007: 公開直後は content_check が pending で一般画面(一覧)に出ないため、著者本人の
      // プロフィールへ遷移し「審査中」であることを伝える(相談公開・A と同方針)。
      toast.success(
        draft
          ? "下書きを保存しました"
          : "公開しました。チェック完了後に表示されます。",
      );
      // 遷移先プロフィールの一覧は Router Cache に古い RSC が残るため、
      // refresh でキャッシュを無効化して更新を反映させる(無いと一覧が古いまま)。
      router.push(ROUTES.USER);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("エラーが発生しました。もう一度お試しください。");
      setIsProcessing(false);
    }
  };

  return {
    body,
    isProcessing,
    handleBack: () => router.back(), // ブラウザバックで編集画面に戻る(データは維持される)
    handleSaveDraft: () => submit(true),
    handlePublish: () => submit(false),
  };
};
