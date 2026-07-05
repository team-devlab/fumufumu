"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { updateConsultation } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_RULES } from "@/features/consultation/config/constants";
import { usePreventUnload } from "@/features/consultation/hooks/usePreventUnload";
import { useSeededDraftEdit } from "@/features/consultation/hooks/useSeededDraftEdit";
import {
  useConsultationEditActions,
  useConsultationEditBody,
  useConsultationEditHasHydrated,
  useConsultationEditIsDirty,
  useConsultationEditTags,
  useConsultationEditTitle,
  useEditingConsultationId,
} from "@/features/consultation/stores/useConsultationEditFormStore";
import type {
  ConsultationDetail,
  ConsultationFormTag,
  Tag,
} from "@/features/consultation/types";

const countCharacters = (text: string) => text.replace(/\s/g, "").length;

// NOTE: 作成フロー(useConsultationEntry)のタグ整合ロジックと同一。
// 3つ目の利用箇所が出たら共有ユーティリティへ抽出する想定で、今は複製している。
const reconcileSelectedTagsWithAvailableTags = (
  selectedTags: ConsultationFormTag[],
  availableTags: Tag[],
): ConsultationFormTag[] => {
  const resolvedTags: ConsultationFormTag[] = [];
  const seenTagIds = new Set<number>();

  for (const selectedTag of selectedTags) {
    const matchedTag =
      selectedTag.id > 0
        ? availableTags.find((tag) => tag.id === selectedTag.id)
        : availableTags.find((tag) => tag.name === selectedTag.name);

    if (!matchedTag || seenTagIds.has(matchedTag.id)) continue;
    seenTagIds.add(matchedTag.id);
    resolvedTags.push({ id: matchedTag.id, name: matchedTag.name });
  }

  return resolvedTags;
};

const areSameTags = (
  leftTags: ConsultationFormTag[],
  rightTags: ConsultationFormTag[],
) => {
  return (
    leftTags.length === rightTags.length &&
    leftTags.every(
      (leftTag, index) =>
        leftTag.id === rightTags[index]?.id &&
        leftTag.name === rightTags[index]?.name,
    )
  );
};

/**
 * 相談の下書きを編集する entry 画面のロジック（ADR 012）。
 * サーバ取得した下書きを編集専用ストアに seed し、下書き保存(更新)・確認画面への遷移を担う。
 * 公開は確認画面(EDIT_CONFIRM)で行う。
 */
export const useConsultationEdit = (
  consultation: ConsultationDetail,
  availableTags: Tag[],
) => {
  const router = useRouter();

  const title = useConsultationEditTitle();
  const body = useConsultationEditBody();
  const tags = useConsultationEditTags();
  const editingId = useEditingConsultationId();
  const hasHydrated = useConsultationEditHasHydrated();
  const isDirty = useConsultationEditIsDirty();
  const { setTitle, setBody, setTags, hydrateForConsultation, reset } =
    useConsultationEditActions();

  // rehydration 完了後、別の相談を開いた時だけサーバ値で seed する
  useSeededDraftEdit({
    hasHydrated,
    editingId,
    targetId: consultation.id,
    seed: () =>
      hydrateForConsultation({
        id: consultation.id,
        title: consultation.title,
        body: consultation.body,
        tags: consultation.tags,
      }),
  });

  // このストアが対象の相談を保持している（seed 済み）か。フォーム描画のゲートに使う
  const isReady = hasHydrated && editingId === consultation.id;

  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTags = reconcileSelectedTagsWithAvailableTags(
    tags,
    availableTags,
  );
  const tagIds = selectedTags
    .map((tag) => tag.id)
    .filter((id) => Number.isInteger(id) && id > 0);

  const titleCharCount = countCharacters(title);
  const bodyCharCount = countCharacters(body);

  // 未保存の変更があれば「更新/閉じる/戻る」で警告（作成フローと同じ機構）
  usePreventUnload(isDirty && !isProcessing);

  const validateBody = () =>
    bodyCharCount >= CONSULTATION_RULES.BODY_MIN_LENGTH;

  const handleToggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some(
      (selectedTag) => selectedTag.id === tag.id,
    );
    if (isSelected) {
      setTags(selectedTags.filter((selectedTag) => selectedTag.id !== tag.id));
      return;
    }

    if (selectedTags.length >= CONSULTATION_RULES.TAGS_MAX_COUNT) {
      toast.error(
        `タグは最大${CONSULTATION_RULES.TAGS_MAX_COUNT}件まで選択できます`,
      );
      return;
    }

    setTags([...selectedTags, { id: tag.id, name: tag.name }]);
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
      // 編集ではタグをプリロード済みのため、常に現在の選択(空含む)を送って総入れ替えする
      await updateConsultation(consultation.id, {
        title,
        body,
        draft: true,
        tagIds,
      });

      reset();
      toast.success("下書きを保存しました");
      router.push(ROUTES.USER);
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました。時間をおいて再度お試しください。");
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
    if (tagIds.length < 1) {
      toast.error("タグを1つ以上選択してください");
      return;
    }

    // 正規化後のタグをストアへ反映してから確認画面へ（不要な isDirty 化を避けるため差分時のみ）
    if (!areSameTags(selectedTags, tags)) {
      setTags(selectedTags);
    }
    router.push(ROUTES.CONSULTATION.EDIT_CONFIRM(consultation.id));
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
    title,
    setTitle,
    body,
    setBody,
    tags: selectedTags,
    isProcessing,
    titleCharCount,
    bodyCharCount,
    handleToggleTag,
    handleSaveDraft,
    handleConfirm,
    handleBack,
  };
};
