"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import { createConsultation } from "@/features/consultation/api/consultationClientApi";
import { fetchTags } from "@/features/consultation/api/tagClientApi";
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

const resolveSelectedTags = (
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

export const useConsultationEntry = () => {
  const router = useRouter();

  // 個別のSelectorフックから値とアクションを取得
  // これにより、例えば tags が更新されても、このコンポーネントは再レンダリングされにくくなります
  const title = useConsultationTitle();
  const body = useConsultationBody();
  const tags = useConsultationTags();
  const { setTitle, setBody, setTags, reset } = useConsultationActions();
  const hasInput = useHasInput();

  const [isProcessing, setIsProcessing] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // 有効文字数を計算
  const titleCharCount = countCharacters(title);
  const bodyCharCount = countCharacters(body);

  useEffect(() => {
    let isMounted = true;

    const loadTags = async () => {
      setIsLoadingTags(true);
      try {
        const response = await fetchTags();
        if (!isMounted) return;
        setAvailableTags(response.data);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          toast.error("タグ一覧の取得に失敗しました");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTags(false);
        }
      }
    };

    void loadTags();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (availableTags.length === 0 || tags.length === 0) return;

    const resolvedTags = resolveSelectedTags(tags, availableTags);
    const isSame =
      resolvedTags.length === tags.length &&
      resolvedTags.every(
        (resolvedTag, index) =>
          resolvedTag.id === tags[index]?.id &&
          resolvedTag.name === tags[index]?.name,
      );

    if (!isSame) {
      setTags(resolvedTags);
    }
  }, [availableTags, tags, setTags]);

  // NOTE: 誤操作による離脱防止
  const isDirty = hasInput && !isProcessing;
  usePreventUnload(isDirty);

  const tagIds = tags
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
    const isSelected = tags.some((selectedTag) => selectedTag.id === tag.id);
    if (isSelected) {
      setTags(tags.filter((selectedTag) => selectedTag.id !== tag.id));
      return;
    }

    if (tags.length >= CONSULTATION_RULES.TAGS_MAX_COUNT) {
      toast.error(
        `タグは最大${CONSULTATION_RULES.TAGS_MAX_COUNT}件まで選択できます`,
      );
      return;
    }

    setTags([...tags, { id: tag.id, name: tag.name }]);
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
    tags,
    availableTags,
    isLoadingTags,
    handleSaveDraft,
    handleToggleTag,
    handleConfirm,
    handleBack,
  };
};
