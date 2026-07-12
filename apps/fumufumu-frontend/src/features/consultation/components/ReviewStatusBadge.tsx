import type React from "react";
import { REVIEW_STATUS_PRESENTATION } from "@/features/consultation/config/reviewStatus";
import type { ReviewStatus } from "@/features/consultation/types";

/**
 * 本人が自分の投稿(一覧・カード)で投稿チェック状態を判別するためのバッジ(#179)。
 *
 * 承認済み(approved)と未指定(旧backend/公開一覧/他人視点)は普段の一覧と同じ見た目にするため何も描画しない。
 * 投稿チェック中(pending)・公開見送り(rejected)のみバッジを出す。文言・配色は
 * REVIEW_STATUS_PRESENTATION に一元化している(相談詳細のバナーと共通)。
 */
export const ReviewStatusBadge: React.FC<{ status?: ReviewStatus }> = ({
  status,
}) => {
  const presentation = status ? REVIEW_STATUS_PRESENTATION[status] : undefined;
  if (!presentation) {
    return null;
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${presentation.badgeClassName}`}
    >
      {presentation.badgeLabel}
    </span>
  );
};
