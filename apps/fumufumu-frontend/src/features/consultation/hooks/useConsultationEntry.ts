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
  useConsultationTags,
  useConsultationTitle,
  useHasInput,
} from "@/features/consultation/stores/useConsultationFormStore";
import type { ConsultationFormTag, Tag } from "@/features/consultation/types";

const countCharacters = (text: string) => text.replace(/\s/g, "").length;

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

export const useConsultationEntry = (availableTags: Tag[]) => {
  const router = useRouter();

  // 個別のSelectorフックから値とアクションを取得
  // これにより、例えば tags が更新されても、このコンポーネントは再レンダリングされにくくなります
  const title = useConsultationTitle();
  const body = useConsultationBody();
  const tags = useConsultationTags();
  const { setTitle, setBody, setTags, reset } = useConsultationActions();
  const hasInput = useHasInput();

  const [isProcessing, setIsProcessing] = useState(false);
  const selectedTags = reconcileSelectedTagsWithAvailableTags(
    tags,
    availableTags,
  );

  // 有効文字数を計算
  const titleCharCount = countCharacters(title);
  const bodyCharCount = countCharacters(body);

  // NOTE: 誤操作による離脱防止
  const isDirty = hasInput && !isProcessing;
  usePreventUnload(isDirty);

  const tagIds = selectedTags
    .map((tag) => tag.id)
    .filter((id) => Number.isInteger(id) && id > 0);

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
        ...(tagIds.length > 0 ? { tagIds } : {}),
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

    if (!areSameTags(selectedTags, tags)) {
      setTags(selectedTags);
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
    tags: selectedTags,
    handleSaveDraft,
    handleToggleTag,
    handleConfirm,
    handleBack,
  };
};
