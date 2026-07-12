import type React from "react";
import { REVIEW_STATUS_PRESENTATION } from "@/features/consultation/config/reviewStatus";
import type { ReviewStatus } from "@/features/consultation/types";

/**
 * 相談詳細で、本人にだけ返る投稿チェック中/公開見送りの相談に公開前状態を伝えるバナー(#179 Phase2)。
 *
 * backend は本人以外に未承認の相談を返さない(他人には404)ため、review_status が pending/rejected の
 * ときは本人に見えている前提でそのまま表示してよい。承認済み/未指定では何も描画しない。
 * 本文自体は伏せず表示し(本人が自分の投稿内容を確認・編集判断できるようにする)、上部にこのバナーを添える。
 * 文言・配色は REVIEW_STATUS_PRESENTATION に一元化(一覧のバッジと共通)。
 */
export const ReviewStatusBanner: React.FC<{ status?: ReviewStatus }> = ({
  status,
}) => {
  const presentation = status ? REVIEW_STATUS_PRESENTATION[status] : undefined;
  if (!presentation) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${presentation.bannerClassName}`}
    >
      {presentation.bannerMessage}
    </div>
  );
};
