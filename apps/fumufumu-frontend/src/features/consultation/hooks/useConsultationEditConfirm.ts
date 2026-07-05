"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { updateConsultation } from "@/features/consultation/api/consultationClientApi";
import {
  useConsultationEditActions,
  useConsultationEditBody,
  useConsultationEditTags,
  useConsultationEditTitle,
  useEditingConsultationId,
} from "@/features/consultation/stores/useConsultationEditFormStore";

// NOTE: 作成フロー(useConsultationConfirm)と同型。ここで「データが無い場合の自動リダイレクト
// (useEffect)」を行わないのも作成と同じ理由: persist の rehydration は非同期で、リロード直後は
// 一瞬空になる。自動遷移させると復元前に飛ばされるため、送信ボタン押下時に検証する。

export const useConsultationEditConfirm = (consultationId: number) => {
  const router = useRouter();

  const title = useConsultationEditTitle();
  const body = useConsultationEditBody();
  const tags = useConsultationEditTags();
  const editingId = useEditingConsultationId();
  const { reset } = useConsultationEditActions();

  const [isProcessing, setIsProcessing] = useState(false);

  const tagIds = tags
    .map((tag) => tag.id)
    .filter((id) => Number.isInteger(id) && id > 0);

  const submit = async (draft: boolean) => {
    // ストアがこの相談の編集内容を保持していない場合(直リンク/リロード直後/別相談保持)は、
    // 誤った相談への更新を防ぐため編集画面へ戻す。編集画面側で本人下書きの認可(404)も行われる。
    if (editingId !== consultationId || !title || !body) {
      toast.error("編集内容が見つかりません。もう一度お試しください。");
      router.replace(ROUTES.CONSULTATION.EDIT(consultationId));
      return;
    }

    // 公開にはタグが1件以上必要
    if (!draft && tagIds.length < 1) {
      toast.error("タグを1つ以上選択してください");
      router.replace(ROUTES.CONSULTATION.EDIT(consultationId));
      return;
    }

    setIsProcessing(true);
    try {
      await updateConsultation(consultationId, {
        title,
        body,
        draft,
        tagIds,
      });

      // 更新成功時は編集ストアを破棄する(次に別の下書きを開いた時に再 seed させる)
      reset();

      // ADR 007: 公開直後は content_check が pending で一般画面(一覧)に出ないため、
      // 著者本人のプロフィールへ遷移し「審査中」であることを伝える。作成側 #155 と同方針。
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
    title,
    body,
    tags,
    isProcessing,
    handleBack: () => router.back(), // ブラウザバックで編集画面に戻る(データは維持される)
    handleSaveDraft: () => submit(true),
    handlePublish: () => submit(false),
  };
};
